if(window.bookCtrl) {
  $(document).find('.book-nav').on('click', function(e) {
    e.preventDefault();
    bookCtrl.goToPage($(e.target).attr('page')-1);
  });
}
