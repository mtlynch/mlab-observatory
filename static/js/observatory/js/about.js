(function() {

	var aboutModal;
	var aboutContent
	var aboutButton;
	var aboutCopy = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tempus velit enim, imperdiet vulputate justo maximus in. Integer vestibulum scelerisque auctor. Donec ullamcorper elit mauris, hendrerit consequat neque tincidunt eget. Fusce sed viverra orci. Sed eget accumsan erat, eget lacinia sem. Duis feugiat placerat quam, at finibus ante ornare sit amet. Nulla facilisi. Mauris dapibus, nibh vitae vehicula gravida, ipsum magna rhoncus velit, a fermentum odio leo vitae est.</p><p>Cras eget hendrerit orci, porttitor vulputate felis. Phasellus semper mi quis quam hendrerit sollicitudin. Vivamus ut sollicitudin nulla, ut finibus augue. Maecenas a ante eget eros porttitor mattis. Pellentesque et fermentum nibh. Nulla dignissim justo porttitor odio ultrices, vitae luctus leo accumsan. Integer rhoncus odio nec ex consectetur lacinia. Ut luctus, libero sed ultricies suscipit, mauris metus ornare risus, ut egestas elit metus at ex.</p><p>Fusce eu porttitor tellus. Nunc dignissim leo eu nunc eleifend, quis iaculis dui tempus. Aliquam non purus turpis. Donec sollicitudin elit ac nunc euismod, non auctor odio facilisis. Sed laoreet, purus ut venenatis pharetra, arcu odio pellentesque elit, non tempus augue augue posuere est. Vivamus ut purus magna. Nullam rutrum erat vel ipsum consequat pretium. Mauris a sagittis quam, cursus dapibus neque. Donec ut ex ut nibh vehicula venenatis ut eu nulla. Fusce ultrices nisl ante, nec malesuada mi volutpat eget. Donec quis maximus tellus, ac ornare enim. Vivamus pellentesque odio nec turpis fringilla suscipit. Morbi vestibulum ipsum elementum tortor vehicula feugiat.</p>"
	
	function init() {
		aboutModal = d3.select('.aboutModal').on('click', clickedModal)
		aboutContent = aboutModal.select('.aboutContent')
			.html(aboutCopy).on('click', clickedContent)
		aboutButton = d3.select('.aboutButton')
		aboutButton.on('click', showAbout)
	}
	function showAbout() {
		aboutModal.style('display','block')
	}
	function clickedModal() {
		aboutModal.style('display','none')
	}
	function clickedContent() {
		d3.event.preventDefault()
		d3.event.stopPropagation()
	}

	if(!window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.about = {
		init: init
	}
})()