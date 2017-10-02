import BookPropsBuilder from './BookPropsBuilder';
import Pdf from 'Pdf';

export default class PdfBookPropsBuilder extends BookPropsBuilder {

  constructor(src, onReady) {
    super(onReady);
    this.pdf = new Pdf(src);
    this.pageDescription = {
      type: 'pdf',
      src: this.pdf,
      interactive: true
    };
    this.binds = {
      pageCallback: this.pageCallback.bind(this)
    };
    this.pdf.getHandler(this.init.bind(this));
  }

  dispose() {
    this.pdf.dispose();
    super.dispose();
  }

  init(handler) {
    this.calcSheets(this.pdf.getPagesNum());
    if(this.pdf.getPagesNum()>0) {
      handler.getPage(1).
        then((page)=> {
          const size = Pdf.getPageSize(page);
          this.calcProps(size.width, size.height);
          this.ready();
        }).
        catch((e)=> {
          console.error(e);
        });
    }
    else {
      this.props = this.defaults;
      this.ready();
    }
  }

  pageCallback(n) {
    return this.pageDescription;
  }

}
