import Finder from 'Finder';

export default class SearchEngine {
  constructor(pageCallback, pages) {
    this.pageCallback = pageCallback;
    this.pages = pages;
    this.results = [];
  }

  setQuery(query) {
    this.query = query;
    this.update = true;
    this.process();
  }

  process() {
    if(this.update) {
      const results = this.results;
      this.results = [];
      if(this.onPageHitsChanged) {
        for(let res of results) {
          this.onPageHitsChanged(undefined, '');
        }
      }
      this.update = false;
      this.page = 0;
      this.stamp = Date.now();
      if(this.query.length>1) {
        this.process();
      }
    }
    else {
      if(this.page<this.pages) {
        const stamp = this.stamp;
        this.find(this.pageCallback(this.page)).
          then((contexts)=> {
            if(stamp === this.stamp) {
              if(contexts.length) {
                this.results.push({
                  page: this.page,
                  contexts
                });
              }
              ++this.page;
              if(this.onPageHitsChanged) {
                this.onPageHitsChanged(this.page, this.query);
              }
              this.process();
            }
          });
      }
    }
  }

  find(pi) {
    let next;
    if(pi.type==='pdf') {
      next = new Promise((resolve)=> {
        pi.src.getHandler((handler)=> {
          handler.getPage((pi.number===undefined? this.page: pi.number)+1).
          then((page)=> {
            page.getTextContent().
            then((textContent)=> {
              resolve(new Finder(textContent.items.map((item)=> item.str), this.query, {hits: false}).getContexts());
            });
          }).
          catch(()=> resolve([]));
        });
      });
    }
    else {
      next = Promise.resolve([]);
    }
    return next;
  }

}
