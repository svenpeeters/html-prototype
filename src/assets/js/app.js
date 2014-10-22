/*  ------------------------------------------------------------------------  *\
    APP.JS
\*  ------------------------------------------------------------------------  */

var app = app || {};

app.ctrl = (function(window, document, $, undefined) {

    var init;

    init = function() {
        console.log('Hello World!');
    };

    return {
        init: init
    };

}(window, document, jQuery));

$(function () {
    // FastClick
    FastClick.attach(document.body);

    // App
    app.ctrl.init();
});
