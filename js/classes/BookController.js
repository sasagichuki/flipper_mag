import {$, THREE} from '../libs';
import Controller from 'Controller';
import {props as  bookControllerProps} from '../props/bookController';
import EventsToActions from 'EventsToActions';
import Stats from 'stats.js';
import Object3DWatcher from 'Object3DWatcher';
import FullScreen from '../THREEx/FullScreen';

export default class BookController extends Controller {

  constructor(book, view, props) {
    super();
    this.book = book;
    this.visual = book.visual;
    this.p = BookController.prepareProps(props);
    this.devicePixelRatio = this.visual.wnd.devicePixelRatio || 1;

    this.orbit = book.visual.getOrbit();
    book.setFlipProgressClb(this.updateViewIfState.bind(this));
    this.view = view;
    this.bindActions();

    this.state = {
      smartPan: !this.actions['cmdSmartPan'].active,
      singlePage: this.actions['cmdSinglePage'].active || this.actions['cmdSinglePage'].activeForMobile && this.devicePixelRatio>1,
      stats: this.actions['cmdStats'].active,
      lighting: this.p.lighting.default,
      activeSide: 1
    };

    this.boxs = [new THREE.Box3(), new THREE.Box3()];
    this.bookWatcher = new Object3DWatcher(this.visual, ()=> {
      if(this.state.singlePage) {
        if(this.state.activeSide) {
          this.boxs[0].setFromObject(book.rightCover.three);
        }
        else {
          this.boxs[0].setFromObject(book.leftCover.three);
        }
      }
      else {
        this.boxs[0].setFromObject(book.leftCover.three);
        this.boxs[1].setFromObject(book.rightCover.three);
        this.boxs[0].union(this.boxs[1]);
      }
      return this.boxs[0];
    });
    this.bookWatcher.scale = this.p.scale.default;

    this.Stats = new Stats();
    this.Stats.domElement.style.position = 'absolute';
    this.Stats.domElement.style.top = '0px';

    this.visual.setExtraLighting(this.state.lighting);
    this.binds = {
      onScreenModeChanged: this.onScreenModeChanged.bind(this),
      stats: this.Stats.update.bind(this.Stats),
      onUpdateView: this.updateView.bind(this)
    }
    FullScreen.addEventListener(this.view.getParentContainer().ownerDocument, this.binds.onScreenModeChanged);

    this.cmdSmartPan();
  }

  dispose() {
    FullScreen.removeEventListener(this.view.getParentContainer().ownerDocument, this.binds.onScreenModeChanged);
    delete this.book;
    delete this.view;
    delete this.visual;
  }

  setTocCtrl(tocCtrl) {
    this.tocCtrl = tocCtrl;
    this.tocCtrl.onChange = this.updateView.bind(this);
    this.updateView();
  }

  setPrinter(printer) {
    this.printer = printer;
    this.updateView();
  }

  setSounds(sounds) {
    this.sounds = sounds;
    sounds.setEnabled(this.actions['cmdSounds'].active);
    this.updateView();
  }


  onScreenModeChanged(e) {
    this.updateView();
  }

  canZoomIn() {
    return !this.state.smartPan || Math.abs(this.bookWatcher.scale-this.p.scale.max)>this.p.eps;
  }

  canZoomOut() {
    return !this.state.smartPan || Math.abs(this.bookWatcher.scale-this.p.scale.min)>this.p.eps;
  }

  canDefaultZoom() {
    return this.state.smartPan;
  }

  cmdZoomIn() {
    if(this.state.smartPan) {
      this.bookWatcher.scale = Math.min(this.p.scale.max, this.bookWatcher.scale+this.p.scale.delta);
    }
    else {
      this.orbit.zoomIn(6.6*this.p.scale.delta/0.32);
    }
    this.updateView();
  }

  cmdZoomOut() {
    if(this.state.smartPan) {
      this.bookWatcher.scale = Math.max(this.p.scale.min, this.bookWatcher.scale-this.p.scale.delta);
    }
    else {
      this.orbit.zoomOut(6.6*this.p.scale.delta/0.32);
    }
    this.updateView();
  }

  cmdDefaultZoom() {
    if(this.state.smartPan) {
      this.bookWatcher.scale = this.p.scale.default;
      this.updateView();
    }
  }

  cmdToc() {
    if(this.tocCtrl) {
      this.tocCtrl.togle();
    }
  }

  cmdFastBackward() {
    this.startFlip(this.book.flipLeft(5));
  }

  cmdBackward() {
    if(this.state.singlePage) {
      this.state.activeSide = (this.getPage()+1)%2;
      if(this.state.activeSide) {
        this.state.activeSide = 0;
        this.updateView();
      }
      else {
        this.startFlip(this.book.flipLeft(1)).then((block)=> {
          if(block) {
            this.state.activeSide = 1;
          }
        });
      }
    }
    else {
      this.startFlip(this.book.flipLeft(1));
    }
  }

  cmdForward() {
    if(this.state.singlePage) {
      this.state.activeSide = (this.getPage()+1)%2;
      if(!this.state.activeSide) {
        this.state.activeSide = 1;
        this.updateView();
      }
      else {
        this.startFlip(this.book.flipRight(1)).then((block)=> {
          if(block) {
            this.state.activeSide = 0;
          }
        });
      }
    }
    else {
      this.startFlip(this.book.flipRight(1));
    }
  }

  cmdFastForward() {
    this.startFlip(this.book.flipRight(5));
  }

  cmdSave() {
    window.open(this.p.downloadURL, '_blank');
  }

  cmdPrint() {
    this.printer.print();
  }

  cmdFullScreen() {
    if(!FullScreen.activated()) {
      FullScreen.request(this.view.getParentContainer());
    }
    else {
      FullScreen.cancel();
    }
  }

  cmdSmartPan() {
    this.state.smartPan = !this.state.smartPan;
    if(this.state.smartPan) {
      this.orbit.minAzimuthAngle = 0;
      this.orbit.maxAzimuthAngle = 0;
      this.orbit.minPolarAngle = 0;
    	this.orbit.maxPolarAngle = Math.PI/4;
      this.bookWatcher.enabled = true;
    }
    else {
      this.orbit.minAzimuthAngle = -Infinity;
      this.orbit.maxAzimuthAngle = Infinity;
      this.orbit.minPolarAngle = 0;
    	this.orbit.maxPolarAngle = Math.PI;
      this.bookWatcher.enabled = false;
    }
    this.updateView();
  }

  cmdSinglePage() {
    this.state.singlePage = !this.state.singlePage;
    this.updateView();
  }

  cmdSounds() {
    if(this.sounds) {
      this.sounds.togle();
    }
    this.updateView();
  }

  cmdStats() {
    this.state.stats = !this.state.stats;
    if(this.state.stats) {
      $(this.view.getContainer()).append(this.Stats.domElement);
      this.visual.addRenderCallback(this.binds.stats);
    }
    else {
      $(this.view.getContainer()).find(this.Stats.domElement).remove();
      this.visual.removeRenderCallback(this.binds.stats);
    }
    this.updateView();
  }

  cmdLightingUp() {
    this.state.lighting = Math.min(this.state.lighting+this.p.lighting.delta, this.p.lighting.max);
    this.visual.setExtraLighting(this.state.lighting);
    this.updateView();
  }

  cmdLightingDown() {
    this.state.lighting = Math.max(this.state.lighting-this.p.lighting.delta, this.p.lighting.min);
    this.visual.setExtraLighting(this.state.lighting);
    this.updateView();
  }

  goToPage(page) {
    const pageNum = Math.max(Math.min(page, this.book.getPages()-1),0);
    this.state.activeSide = (pageNum+1)%2;
    let target = Math.max(Math.min(page-1+page%2, this.book.getPages()-1),0), current = this.book.getPage(), flips = [], covs = 0;;
    if(target!=current) {
      if(current===0) {
        flips.push(1);
        current+=1;
        ++covs;
      }
      else if(current===this.book.getPages()-1) {
        flips.push(-1);
        current-=2;
        ++covs;
      }
      let cv = 0;
      if(target===0) {
        cv = -1;
        target+=1;
        ++covs;
      }
      else if(target===this.book.getPages()-1) {
        cv = 1;
        target-=2;
        ++covs;
      }
      if(target-current) {
        flips.push(Math.ceil((target-current)/2));
      }
      if(cv) {
        flips.push(cv);
      }
    }

    const setClb = (fl, time, clb)=> {
      setTimeout(()=> {
        if(fl<0) {
          this.startFlip(this.book.flipLeft(-fl, clb));
        }
        else {
          this.startFlip(this.book.flipRight(fl, clb));
        }
      }, time);
    };

    if(covs===2) {
      setClb(flips[0], 0, (block, progress, state)=> {
        if(state=='finish' && progress==1) {
          setClb(flips[flips.length-1], 0);
        }
      });
      setClb(flips[1], 500);
    }
    else {
      let time = 0;
      for(let fl of flips) {
        setClb(fl, time);
        time+=250;
      }
    }
  }

  startFlip(flipRes) {
    return flipRes? flipRes.then((block)=> {
      if(block) {
        this.dispatchAsync({
          type: 'startFlip'
        });
      }
      return block;
    }): Promise.resolve(undefined);
  }

  endFlip(block) {
    this.dispatchAsync({
      type: 'endFlip'
    });
    return block;
  }

  getPage() {
    const page = this.book.getPage();
    return page? Math.min(this.book.getPage()+this.state.activeSide, this.book.getPages()-1): 0;
  }

  getPageForGUI() {
    return (this.state.singlePage? this.getPage(): this.book.getPage())+1;
  }

  inpPage(e, data) {
    this.goToPage(data-1);
  }

  updateViewIfState(block, progress, state, type) {
    if(state==='init' || state==='finish') {
      setTimeout(this.updateView.bind(this), 100);
    }
    if(state==='finish') {
      this.endFlip(block);
    }
  }

  updateView() {
    if(this.view) {
      this.view.setState('cmdZoomIn', {
        enable: this.canZoomIn(),
        visible: this.actions['cmdZoomIn'].enabled,
        active: false
      });

      this.view.setState('cmdZoomOut', {
        enable: this.canZoomOut(),
        visible: this.actions['cmdZoomOut'].enabled,
        active: false
      });

      this.view.setState('cmdDefaultZoom', {
        enable: this.canDefaultZoom(),
        visible: this.actions['cmdDefaultZoom'].enabled,
        active: this.canDefaultZoom() && Math.abs(this.bookWatcher.scale-this.p.scale.default)<this.p.eps
      });

      this.view.setState('cmdToc', {
        enable: !!this.tocCtrl,
        visible: this.actions['cmdToc'].enabled && this.tocCtrl,
        active: this.tocCtrl && this.tocCtrl.visible
      });

      const left = this.book.getLeftFlipping(),
            right = this.book.getRightFlipping();

      const flippersEnable = {
        cmdFastBackward: !!left,
        cmdBackward: !!left,
        cmdForward: !!right,
        cmdFastForward: !!right
      };

      for(let name of Object.keys(flippersEnable)) {
        this.view.setState(name, {
          enable: flippersEnable[name],
          visible: this.actions[name].enabled,
          active: false
        });
      }

      this.view.setState('inpPages', {
        visible: true,
        value: this.book.getPages()
      });

      this.view.setState('inpPage', {
        visible: true,
        enable: !this.book.isProcessing(),
        value: this.getPageForGUI()
      });

      this.view.setState('cmdSave', {
        enable: true,
        visible: this.actions['cmdSave'].enabled && !!this.p.downloadURL,
        active: false
      });

      this.view.setState('cmdPrint', {
        enable: true,
        visible: this.actions['cmdPrint'].enabled && !!this.printer,
        active: false
      });

      this.view.setState('cmdFullScreen', {
        enable: FullScreen.available(),
        visible: this.actions['cmdFullScreen'].enabled,
        active: FullScreen.available() && FullScreen.activated()
      });

      this.view.setState('widSettings', {
        enable: true,
        visible: this.actions['widSettings'].enabled,
        active: false
      });

      this.view.setState('cmdSmartPan', {
        enable: true,
        visible: this.actions['cmdSmartPan'].enabled,
        active: this.state.smartPan
      });

      this.view.setState('cmdSinglePage', {
        enable: true,
        visible: this.actions['cmdSinglePage'].enabled,
        active: this.state.singlePage
      });

      this.view.setState('cmdSounds', {
        enable: true,
        visible:  this.actions['cmdSounds'].enabled && !!this.sounds,
        active: !!this.sounds && this.sounds.enabled
      });

      this.view.setState('cmdStats', {
        enable: true,
        visible: this.actions['cmdStats'].enabled,
        active: this.state.stats
      });

      this.view.setState('cmdLightingUp', {
        enable: Math.abs(this.state.lighting-this.p.lighting.max)>this.p.eps,
        visible: this.actions['cmdLightingUp'].enabled,
        active: false
      });

      this.view.setState('cmdLightingDown', {
        enable: Math.abs(this.state.lighting-this.p.lighting.min)>this.p.eps,
        visible: this.actions['cmdLightingDown'].enabled,
        active: false
      });
    }
  }

  getActions() {
    return {
      cmdZoomIn: {
        activate: this.cmdZoomIn.bind(this)
      },
      cmdZoomOut: {
        activate: this.cmdZoomOut.bind(this)
      },
      cmdDefaultZoom: {
        activate: this.cmdDefaultZoom.bind(this)
      },
      cmdToc: {
        activate: this.cmdToc.bind(this)
      },
      cmdFastBackward: {
        activate: this.cmdFastBackward.bind(this)
      },
      cmdBackward: {
        activate: this.cmdBackward.bind(this)
      },
      cmdForward: {
        activate: this.cmdForward.bind(this)
      },
      cmdFastForward: {
        activate: this.cmdFastForward.bind(this)
      },
      cmdSave: {
        activate: this.cmdSave.bind(this)
      },
      cmdPrint: {
        activate: this.cmdPrint.bind(this)
      },
      cmdFullScreen: {
        activate: this.cmdFullScreen.bind(this)
      },
      cmdSmartPan: {
        activate: this.cmdSmartPan.bind(this)
      },
      cmdSinglePage: {
        activate: this.cmdSinglePage.bind(this)
      },
      cmdSounds: {
        activate: this.cmdSounds.bind(this)
      },
      cmdStats: {
        activate: this.cmdStats.bind(this)
      },
      cmdLightingUp: {
        activate: this.cmdLightingUp.bind(this)
      },
      cmdLightingDown: {
        activate: this.cmdLightingDown.bind(this)
      },
      cmdPanLeft: {
        activate: (e)=> this.orbit.actions.pan(e, {
          state: 'move',
          dx: -this.p.pan.speed,
          dy: 0
        })
      },
      cmdPanRight: {
        activate: (e)=> this.orbit.actions.pan(e, {
          state: 'move',
          dx: this.p.pan.speed,
          dy: 0
        })
      },
      cmdPanUp: {
        activate: (e)=> this.orbit.actions.pan(e, {
          state: 'move',
          dx: 0,
          dy: -this.p.pan.speed
        })
      },
      cmdPanDown: {
        activate: (e)=> this.orbit.actions.pan(e, {
          state: 'move',
          dx: 0,
          dy: this.p.pan.speed
        })
      },
      mouseCmdRotate: {
        activate: this.orbit.actions.rotate
      },
      mouseCmdDragZoom: {
        activate: (e, data)=> {
          if(data.dy>0) {
            this.cmdZoomOut();
          }
          else if(data.dy<0) {
            this.cmdZoomIn();
          }
        }
      },
      mouseCmdPan: {
        activate: this.orbit.actions.pan
      },
      mouseCmdWheelZoom: {
        activate: (e)=> {
          e.preventDefault();
          if(e.deltaY<0) {
            this.cmdZoomOut();
          }
          else if(e.deltaY>0) {
            this.cmdZoomIn();
          }
        }
      },
      touchCmdRotate: {
        activate: (e, data)=> {
          e.preventDefault();
          this.orbit.actions.rotate(e, data);
        }
      },
      touchCmdZoom: {
        activate: (e, data)=> {
          e.preventDefault();
          if(data.dy>0) {
            this.cmdZoomOut();
          }
          else if(data.dy<0) {
            this.cmdZoomIn();
          }
        }
      },
      touchCmdPan: {
        activate: (e, data)=> {
          e.preventDefault();
          this.orbit.actions.pan(e, data);
        }
      },
      widSettings: {
        activate: ()=> undefined
      }
    };
  }

  bindActions() {
    this.eToA = new EventsToActions($(this.visual.element));
    this.eToA.addAction((e)=> e.preventDefault(), 'contextmenu', EventsToActions.mouseButtons.Right, 0);

    this.actions = this.getActions();
    for(let name of Object.keys(this.actions)) {
      const action = {
        ...this.actions[name],
        ...this.p.actions[name]
      };
      this.actions[name] = action;
      if(action.enabled) {
        const flags = action.flags || 0;
        if(action.type) {
          this.eToA.addAction(action.activate, action.type, action.code, flags);
        }
        else if(action.code!==undefined) {
          this.eToA.addAction(action.activate, 'keydown', action.code, flags);
        }
      }
    }
  }

  static prepareProps(props) {
    return BookController.calcProps(BookController.mergeProps(bookControllerProps(), props));
  }

  static setActions(props, actions) {
    for(let name of Object.keys(actions || {})) {
      props.actions[name] = {
        ...props.actions[name],
        ...actions[name]
      };
    }
  }

  static mergeProps(first, second) {
    second = second || {};
    const props = {
      ...first,
      ...second,
      scale: {
        ...first.scale,
        ...second.scale,
      },
      lighting: {
        ...first.lighting,
        ...second.lighting,
      },
      pan: {
        ...first.pan,
        ...second.pan,
      },
      actions: {
        ...first.actions,
      }
    };
    BookController.setActions(props, first.actions);
    BookController.setActions(props, second.actions);
    return props;
  }

  static calcProps(props) {
    props.scale.delta = (props.scale.max-props.scale.min)/props.scale.levels;
    props.lighting.delta = (props.lighting.max-props.lighting.min)/props.lighting.levels;
    return props;
  }

}
