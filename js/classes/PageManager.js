import {$, THREE} from '../libs'
import Cache from 'Cache';
import LoadingAnimation from 'LoadingAnimation';
import ImageFactory from 'ImageFactory';
import BaseMathUtils from 'BaseMathUtils';
import TextureAnimator from 'TextureAnimator';

export default class PageManager {

  constructor(visual, book, p) {
    this.visual = visual;
    this.book = book;
    this.pageQuery = '';
    this.p = p;
    this.pageCache = new Cache(p.cachedPages);
    this.resourcesCache = new Cache();
    this.canvas = $('<canvas>')[0];
    this.imageFactory = new ImageFactory({...visual, dispatchEvent: book.dispatchEvent.bind(book), renderCanvas: this.canvas, renderCanvasCtx: this.canvas.getContext('2d')}, this.resourcesCache);

    this.loadings = [];
    this.renderQueue = [];
    this.pageRequests = [];
    this.predictedRequests = [];

    this.tmpMaterial = new THREE.MeshBasicMaterial();
    visual.addObject(new THREE.Mesh(new THREE.PlaneGeometry(0, 0), this.tmpMaterial));

    this.loading = {};
    this.loading[p.cover.color] = this.createLoadingTexture(p.cover);
    if(p.page.color!==p.cover.color) {
      this.loading[p.page.color] = this.createLoadingTexture(p.page);
    }

    this.turnOnEvents();

    visual.addRenderCallback(this.update.bind(this));

    setInterval(this.updateRenderQueue.bind(this), 250);
  }

  createLoadingTexture(p) {
    const spriteTiles = 6,
      scale = Math.sqrt(4.5*210*4.5*297/(p.widthTexels*p.heightTexels)),
      animation = new LoadingAnimation(scale*p.widthTexels, scale*p.heightTexels, p.color),
      animator = new TextureAnimator(animation.createSprite(spriteTiles), spriteTiles, 1, spriteTiles, 0.2);
    animation.dispose();
    return animator;
  }

  dispose() {
    this.turnOffEvents();
    for(let color of Object.keys(this.loading)) {
      this.loading[color].dispose();
    }
    delete this.loading;
    this.resourcesCache.dispose();
    this.pageCache.dispose();
    this.canvas.height = this.canvas.width = 0;
    delete this.canvas;
  }

  isCover(n) {
    return n<2 || n>=2*(this.p.sheets+1);
  }

  update(dt) {
    const loading = {};
    for(let o of this.loadings) {
      if(o.isActive()) {
        loading[o.color] = true;;
      }
    }
    for(let color of Object.keys(loading)) {
      this.loading[color].update(dt);
    }
  }

  removeFromLoadings(o) {
    const i = this.loadings.indexOf(o);
    if(~i) {
      this.loadings.splice(i, 1);
    }
  }

  removeFromRenderQueue(o) {
    const i = this.renderQueue.indexOf(o);
    if(~i) {
      this.renderQueue.splice(i, 1);
    }
  }

  refreshPageQuery(n, query='') {
    this.pageQuery = query;
    const object = this.pageCache.get(n);
    if(object && object.wrapper && object.wrapper.setQuery) {
      if(!this.pageCache.remove(n)) {
        object.wrapper.setQuery(query);
      }
    }
  }

  getLayers(n, clb) {
    if(this.p.cssLayersLoader) {
      this.p.cssLayersLoader(n, (...args)=> {
        const object = this.pageCache.get(n);
        if(object) {
          if(object.state!=='active') {
            object.pendings.push({clb, args});
          }
          else {
            clb(...args);
          }
        }
      });
    }
    else {
      clb([]);
    }
  }

  resolvePendings(pendings) {
    for(let p of pendings) {
      try {
        p.clb(...p.args);
      }
      catch(e) {
        console.error(e);
      }
    }
    pendings.splice(0, pendings.length);
  }

  load(material, n) {
    const pi = this.p.pageCallback(n), p = this.isCover(n)? this.p.cover: this.p.page;
    const o = {
      texture: new THREE.Texture(),
      wrapper: null,
      state: 'loading',
      locked: (n)=> o.state === 'loading' || o.state === 'rendering' || this.book.isActivePage(n),
      color: p.color,
      isActive: ()=> this.book.isActivePage(n),
      dispose: ()=> {
        this.removeFromLoadings(o);
        this.removeFromRenderQueue(o);
        if(o.wrapper && o.wrapper.dispose) {
          o.wrapper.dispose();
        }
        o.texture.dispose();
        delete o.texture;
        delete o.wrapper;
      },
      pendings: []
    };
    o.texture.minFilter = THREE.LinearFilter;
    this.loadings.push(o);
    this.setMaterial(o, material);

    Promise.resolve().then(()=> {
      if(o.texture) {
        const widthTexels = pi.widthTexels || p.widthTexels,
              heightTexels = pi.heightTexels || p.heightTexels;
        o.wrapper = this.imageFactory.build(pi, pi.number===undefined? n: pi.number, widthTexels, heightTexels, p.color, this.p.injector);
        if(o.wrapper.setQuery) {
          o.wrapper.setQuery(this.pageQuery);
        }
        o.simulate = pi.interactive? (o.wrapper.simulate || (()=> undefined)).bind(o.wrapper): undefined;
        o.wrapper.onLoad = ()=> {
          if(o.state !== 'queuedForRender') {
            o.state = 'queuedForRender';
            this.renderQueue.push(o);
            this.updateRenderQueue();
          }
        };
        o.wrapper.onChange = (image)=> {
          if(o.texture) {
            this.removeFromLoadings(o);
            if(o.material) {
              o.material.map = o.texture;
              o.material.needsUpdate = true;
            }
            o.texture.image = image;
            o.texture.needsUpdate = true;
            o.texture.onUpdate = ()=> {
              if(o.state !== 'queuedForRender') {
                o.state = 'active';
                this.resolvePendings(o.pendings);
              }
              delete this.rendering;
              this.updateRenderQueue();
            };
            this.tmpMaterial.map = o.texture;
            this.tmpMaterial.needsUpdate = true;
          }
        };
      }
    });
    return this.pageCache.put(n, o);
  }

  updateRenderQueue() {
    const p = this.book.p;
    if(!this.rendering && (p.renderWhileFlipping || !this.book.isProcessing())) {
      for(let o of this.renderQueue) {
        if(o.isActive()) {
          this.rendering = o;
          break;
        }
      }
      if(p.renderInactivePages) {
        this.rendering = this.rendering || this.renderQueue[0];
      }
      if(this.rendering) {
        this.removeFromRenderQueue(this.rendering);
        this.rendering.state = 'rendering';
        this.rendering.wrapper.startRender();
      }
    }
  }

  turnOnEvents() {
    this.transferEvents = true;
  }

  turnOffEvents() {
    const mouseup = $.Event('mouseup'), mouseout = $.Event('mouseout');
    this.pageCache.forEach((ent)=> {
      const object = ent[1];
      if(object.simulate) {
        object.simulate(mouseup, undefined, 0, 0);
        object.simulate(mouseout, undefined, 0, 0);
      }
    });
    this.transferEvents = false;
  }

  transferEventToTexture(n, e, data) {
    if(this.transferEvents) {
      const toObject = this.getOrLoadTextureObject(undefined, n), {uv} = data, toDoc = toObject.wrapper.getSimulatedDoc();
      this.pageCache.forEach((ent)=> {
        const object = ent[1];
        if(object.simulate) {
          object.simulate(e, toDoc, uv.x, uv.y);
        }
      });
    }
  }

  loadPredictedPages() {
    this.predictedRequests = BaseMathUtils.predict(this.pageRequests, this.p.preloadPages);
    for(let p of this.predictedRequests) {
      if(p<this.book.getPages() && !this.pageCache.get(p)) {
        this.load(undefined, p);
      }
    }
  }

  addPageRequest(n) {
    this.pageRequests.push(n);
    if(this.pageRequests.length>this.p.pagesForPredicting) {
      this.pageRequests.shift();
    }
    Promise.resolve().then(this.loadPredictedPages.bind(this));
  }

  setMaterial(o, material) {
    this.pageCache.forEach((e)=> {
      const ob = e[1];
      if(o!==ob && ob.material===material) {
        delete ob.material;
      }
    });
    if(material && material!==o.material) {
      o.material = material;
      material.map = o.texture.image? o.texture: this.loading[o.color].texture;
      material.needsUpdate = true;
    }
  }

  getOrLoadTextureObject(material, n) {
    let object = this.pageCache.get(n);
    if(!object) {
      object = this.load(material, n);
      this.addPageRequest(n);
    }
    else {
      this.setMaterial(object, material);
    }

    return object;
  }

  setTexture(material, n) {
    if(~this.predictedRequests.indexOf(n)) {
      this.addPageRequest(n);
    }
    this.getOrLoadTextureObject(material, n);
  }
}
