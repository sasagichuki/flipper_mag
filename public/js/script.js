$(function() {
  var onScroll = function() {
    var y = $(document).scrollTop();
    $('.hover-menu').css('top', (y<60?70-y:10)+'px');
  };
  $('body').scrollspy({target: '.hover-menu'});

  $(document).on('scroll', onScroll);
  onScroll();
});

$(document).click(function(e) {
  if(e.target.id==='show-source') {
    e.preventDefault();
    var sourceWindow = window.open('','Source code','height=800,width=800,scrollbars=1,resizable=1');
    if(window.focus) sourceWindow.focus();
    $.get($(e.target).attr('data'), function(source) {
      source = ['<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Source code</title>\n<link rel="stylesheet" href="css/style.css">\n<script src="js/jquery.min.js"></script>\n</head>\n<body>\n', source, '</body>\n</html>\n'].join('');
      source = source.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      source = ['<pre>',source,'</pre>'].join('');
      $(sourceWindow.document.body).html(source);
    });
  }
});


// Lightbox Effect

var fb3d = {
  activeModal: undefined,
  capturedElement: undefined
};

(function() {
  function findParent(parent, node) {
    while(parent && parent!=node) {
      parent = parent.parentNode;
    }
    return parent;
  }
  $('body').on('mousedown', function(e) {
    fb3d.capturedElement = e.target;
  });
  $('body').on('click', function(e) {
    if(fb3d.activeModal && fb3d.capturedElement===e.target) {
      if(!findParent(e.target, fb3d.activeModal[0]) || findParent(e.target, fb3d.activeModal.find('.cmd-close')[0])) {
        e.preventDefault();
        fb3d.activeModal.fb3dModal('hide');
      }
    }
    delete fb3d.capturedElement;
  });
})();

$.fn.fb3dModal = function(cmd) {
  setTimeout(function() {
    function fb3dModalShow() {
      if(!this.hasClass('visible')) {
        $('body').addClass('fb3d-modal-shadow');
        this.addClass('visible');
        fb3d.activeModal = this;
        this.trigger('fb3d.modal.show');
      }
    }
    function fb3dModalHide() {
      if(this.hasClass('visible')) {
        $('body').removeClass('fb3d-modal-shadow');
        this.removeClass('visible');
        fb3d.activeModal = undefined;
        this.trigger('fb3d.modal.hide');
      }
    }
    var mdls = this.filter('.fb3d-modal');
    switch(cmd) {
      case 'show':
        fb3dModalShow.call(mdls);
      break;
      case 'hide':
        fb3dModalHide.call(mdls);
      break;
    }
  }.bind(this), 50);
};


// Manuals image view

$(function() {
  $([
    '<div class="modal fade" id="modal-wnd" tabindex="-1" role="dialog">',
      '<div class="modal-dialog" role="document">',
        '<div class="modal-content">',
          '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
          '<img src="" alt="" />',
        '</div>',
      '</div>',
    '</div>',
    '<div class="test-img-size">',
      '<img src="" alt="" />',
    '</div>'
  ].join('')).appendTo('body');
  var instance = {
    img: null,
    testImg: $('.test-img-size img')[0],
    modal: {
      wnd: $('#modal-wnd'),
      img: $('#modal-wnd img')[0],
      content: $('#modal-wnd .modal-dialog')
    }
  };
  $(window).on('resize', function() {
    instance.modal.content.css('width', instance.testImg.width+30+'px');
  });
  $(instance.testImg).on('load', function() {
    instance.modal.content.css('width', instance.testImg.width+30+'px');
    instance.modal.wnd.modal('show');
  });
  instance.modal.wnd.on('show.bs.modal', function() {
    instance.modal.img.src = instance.img.src;
    instance.modal.img.alt = instance.img.alt;
  });
  $(document).click(function(e) {
    var target = e.target;
    while(target && !$(target).hasClass('doc-image')) {
      target = target.parentNode;
    }
    if(target && e.target.src) {
      instance.img = e.target;
      instance.testImg.src = instance.img.src;
    }
  });
});
