d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

if(typeof console === 'undefined') {
	console = {}
}
console.log = function() {}