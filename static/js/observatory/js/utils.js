//d3 helper to move selection to front
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

//ensure console doesn't break anything
if(typeof console === 'undefined') {
  console = {}
}
if(typeof console.log === 'undefined') {
  console.log = function() {};
}

//cookie utils, used for displaying help just once
(function() {
  var exports = new EventEmitter()

  function setCookie(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+d.toUTCString();
      document.cookie = cname + "=" + cvalue + "; " + expires;
  }

  function getCookie(cname) {
      var name = cname + "=";
      var ca = document.cookie.split(';');
      for(var i=0; i<ca.length; i++) {
          var c = ca[i];
          while (c.charAt(0)==' ') c = c.substring(1);
          if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
      }
      return "";
  }

  exports.setCookie = setCookie;
  exports.getCookie = getCookie;
  if( ! window.mlabOpenInternet){
    window.mlabOpenInternet = {}
  }
  window.mlabOpenInternet.utils = exports;
})()
