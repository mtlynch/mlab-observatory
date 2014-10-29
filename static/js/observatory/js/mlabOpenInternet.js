(function() {

	var dataLoader = mlabOpenInternet.dataLoader;
	var viz = mlabOpenInternet.viz;
	var exploreViz = mlabOpenInternet.exploreViz;
	var compareViz = mlabOpenInternet.compareViz;
	var filters = mlabOpenInternet.filters;
	var list = mlabOpenInternet.list;
	var about = mlabOpenInternet.about;
	var controls = mlabOpenInternet.controls
	var timeControl = mlabOpenInternet.timeControl
	var help = mlabOpenInternet.help
	var activeTab = null;
	function init() {
		about.init();
		dataLoader.on('loaded', loaded)
		dataLoader.init();
	}
	function loaded() {
		//console.log('loaded')
		//console.log(controls);
		
		timeControl.init();
		timeControl.hide()
		controls.init()
		
		exploreViz.init()
		exploreViz.hide()
		compareViz.init()
		compareViz.hide()
		help.init();
		help.hide()
		
		controls.addListener('switchTab', switchTab)
		controls.addListener('selectionChanged', selectionChanged)
		timeControl.addListener('timeChanged', timeChanged)
		//timeControl.show()
		//exploreViz.show()
	}
	function timeChanged(e) {
		if(activeTab.id === 'explore') {
			exploreViz.show()
		} else if(activeTab.id === 'compare') {
			compareViz.show()
		}

	}
	function selectionChanged(e) {
		if(activeTab.id === 'explore') {
			timeControl.show()
			exploreViz.show()
		} else if(activeTab.id === 'compare') {
			timeControl.show()
			compareViz.show()
		} else if(activeTab.id === 'help') {
			help.show()
		}

	}
	function switchTab(tab) {
		console.log(activeTab)
		console.log(tab)
		if(activeTab !== null) {
			//destroy active tab if needed
			switch(activeTab.id) {
				case 'explore':
					exploreViz.hide();
					timeControl.hide();
					break;
				case 'compare':
					compareViz.hide()
					timeControl.hide();
				case 'help':
					help.hide()

			}
		}
		activeTab = tab
		switch(activeTab.id) {
			case 'explore': 
				timeControl.show()
				exploreViz.show()
				break;
			case 'compare':
				timeControl.show();
				compareViz.show()
				break;
			case 'help':
				help.show()
	

		}

	}
	if( ! window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.app = {
		init: init
	}
})()

mlabOpenInternet.app.init()
