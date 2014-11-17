/*
Main MLab Application.

Gets everything going
*/
(function() {

	var dataLoader = mlabOpenInternet.dataLoader;
	var viz = mlabOpenInternet.viz;
	var exploreViz = mlabOpenInternet.exploreViz;
	var compareViz = mlabOpenInternet.compareViz;
	var filters = mlabOpenInternet.filters;
	var list = mlabOpenInternet.list;
	var controls = mlabOpenInternet.controls
	var timeControl = mlabOpenInternet.timeControl
	var help = mlabOpenInternet.help
	var activeTab = null;

	/* request initial data to build controls */
	function init() {
		dataLoader.on('loaded', loaded)
		dataLoader.init();
	}

	/* once data is loaded, setup each element of visual */
	function loaded() {
		
		timeControl.init();
		timeControl.hide()
		
		exploreViz.init()
		exploreViz.hide()
		compareViz.init()
		compareViz.hide()

		controls.init()

		help.init();
		help.hide()
		
		/* event listeners for changing controls */
		controls.addListener('switchTab', switchTab)
		controls.addListener('selectionChanged', selectionChanged)
		timeControl.addListener('timeChanged', timeChanged)
	}

	/* update visualization once time slider control changes */
	function timeChanged(e) {
		if(activeTab.id === 'explore') {
			exploreViz.show()
		} else if(activeTab.id === 'compare') {
			compareViz.show()
		}

	}

	/* update visualization based on any other time of control change */
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

	/* if we switch tabs, switch out the visible view */
	function switchTab(tab) {
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
