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
	var activeTab = null;
	function init() {
		about.init();
		dataLoader.on('loaded', loaded)
		dataLoader.init();
	}
	function loaded() {
		console.log('loaded')
		console.log(controls);
		exploreViz.init()
		compareViz.init()
		compareViz.hide()
		controls.init()
		controls.addListener('switchTab', switchTab)
		controls.addListener('selectionChanged', selectionChanged)
		console.log(timeControl)
		timeControl.init();
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
		console.log('show')
		timeControl.show()
		if(activeTab.id === 'explore') {
			exploreViz.show()
		} else if(activeTab.id === 'compare') {
			compareViz.show()
		}
	}
	function switchTab(tab) {
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


		}

	}
	/*
	function update(){

		console.log("ISPList: ");
		console.log(dataLoader.getISPList());

		console.log("CodeList");
		console.log(dataLoader.getCodeList());

		console.log("CodeCity: ");
		console.log(dataLoader.getCodeCity());

		console.log("codeTP");
		console.log(dataLoader.getCodeTP());

		console.log("cityCode:");
		console.log(dataLoader.getCityCode());

		console.log("dataAccessMap: ");
		console.log(dataLoader.getDataAccessMap());

		var cityCode = dataLoader.getCityCode();
		var ISPList = dataLoader.getISPList();
		var dataAccessMap = dataLoader.getDataAccessMap();

		var defaultCityState = "New York, NY";
		var defaultYear = "2014";
		var years = [2012];

		var listOfCodeComb = cityCode[defaultCityState];
		var listOfDataId = [];

		for(var i = 0; i < listOfCodeComb.length; i++){
			for(var j = 0; j < ISPList.length; j++){
				for(var k = 0; k < years.length; k++){
					var accessStr = years[k] + "-" + listOfCodeComb[i] + "-" + ISPList[j];
					if(accessStr in dataAccessMap){
						listOfDataId.push(dataAccessMap[accessStr]);
						// build Menu here
						// change URL Hash
					}
				}
			}
		}

		viz.drawCanvas(listOfDataId);

		var defaultCompISP = "at&t";
		var arrListOfCode = {};

		for(var key in cityCode){
			arrListOfCode[key] = [];
			for(var i = 0; i < cityCode[key].length; i++){
				var accessStr = years[0] + "-" + cityCode[key][i] + "-" + defaultCompISP;
				if(accessStr in dataAccessMap){
					arrListOfCode[key].push(dataAccessMap[accessStr]);
				}
			}
		}

		viz.drawComparison(arrListOfCode);

	}
	*/
	if( ! window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.app = {
		init: init
	}
})()

mlabOpenInternet.app.init()
