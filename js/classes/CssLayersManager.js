import SheetCssLayer from './SheetCssLayer';

export default class CssLayersManager {
  constructor(book) {
    this.book = book;
    this.visual = book.visual;
    this.pageManager = book.pageManager;
    this.wrappers = {};
  }

  getActives() {
    const page = this.book.getPage(), pages = this.book.getPages();
    return page===0 || page===pages-1? [page]: [page, page+1];
  }

  dispose() {
    for(let w of Object.values(this.wrappers)) {
      w.layers.forEach((l)=> l.dispose());
    }
    delete this.wrappers;
  }

  show() {
    this.hidden = false;
    for(let n of this.getActives()) {
      const w = this.wrappers[n];
      if(w) {
        if(w.state==='ready' && w.layers.length) {
          const block = this.book.getBlockByPage(n);
          w.layers.forEach((l)=> {
            if(l.isHidden()) {
              l.update(block);
              l.show();
            }
          });
        }
      }
      else {
        const w = this.wrappers[n] = {
          state: 'loading',
          layers: []
        };
        Promise.resolve().then(()=> {
          this.pageManager.getLayers(n, (layers)=> {
            if(layers.length && this.wrappers) {
              const block = this.book.getBlockByPage(n);
              for(let l of layers) {
                const sl = new SheetCssLayer(this.visual, block);
                w.layers.push(sl);
                sl.set(l.css, l.html, l.js);
              }
              setTimeout(()=> {
                if(!this.hidden && ~this.getActives().indexOf(n)) {
                  w.layers.forEach((l)=> l.show());
                }
              }, 10);
            }
            w.state = 'ready';
          });

        });
      }
    }

  }

  hide() {
    this.hidden = true;
    const wait = [];
    for(let w of Object.values(this.wrappers)) {
      w.layers.forEach((l)=> wait.push(l.hide()));
    }
    return Promise.all(wait);
  }
}
