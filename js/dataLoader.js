(function() {
	var exports = new EventEmitter()
	var metadatafolder = 'metadata/'

	var mapFile = metadatafolder + "codeMap.csv"
	var validCodesFile = metadatafolder + 'validKeys.txt'
	var metricFile = metadatafolder + 'metrics.json'

	var dataPath = "data/"
	var validCodes = [];
	var ispsBySite = {}
	var validISPs = [];
	var validSiteNames = [];
	var validCities = [];
	var siteMappings = null;
	var metrics = null;
	var dailyDataByCode = {};
	var hourlyDataByCode = {};
	/*
	var ispList = [];
	var codeList = [];

	var codeCity = {};
	var codeTP = {};
	var cityCode = {};

	var years = [2012, 2013, 2014];
	var ynums = [366, 365, 243];

	var pathList = [];
	var dataAccessMap = {};

	var aggDailyData = [];
	var aggHourlyData = [];
	*/
	function init() {
		d3.xhr(validCodesFile, loadCodes)
	}
	function loadCodes(err, data) {
		console.log(data)
		var response = data.response.split('\n')
		_.each(response, function(code) {
			if(code === '') {
				return;
			}
			validCodes.push(code)
			var codeParts = code.split('_')
			var siteID = codeParts[0];
			var isp = codeParts[1];
			if(validISPs.indexOf(isp) === -1) {
				validISPs.push(isp);
			}
			if(validSiteNames.indexOf(siteID) === -1) {
				validSiteNames.push(siteID);
				ispsBySite[siteID] = []
			}
			ispsBySite[siteID].push(isp)

		})

		console.log(validCodes);
		console.log(validISPs);
		console.log(validSiteNames);
		d3.csv(mapFile, loadCodeMappings)
	}

	function loadCodeMappings(err, data) {
		siteMappings = data;
		_.each(data, function(mapping) {
			var cityState = mapping['City'] + ', ' + mapping['State'];
			mapping.cityState = cityState
			if(validCities.indexOf(cityState) === -1) {
				validCities.push(cityState)
			}
		})

		d3.json(metricFile, loadMetrics);
	}
	function loadMetrics(err, data) {
		if(err) {
			console.error('error loading metrics file')
			console.log(err);
			return
		}
		metrics = data;
		exports.emitEvent('loaded')
	}
	function getCombinations(city) {
		var mLabSites = _.select(siteMappings, function(d) { return d.cityState === city })
		var combos = []
		_.each(mLabSites, function(site) {
			var code = site.MlabSiteName.toLowerCase()
			var siteISPs = ispsBySite[code]
			_.each(siteISPs, function(isp) {
				var comboObject = {
					label: isp + ' x ' + site.TransitProvider,
					filename: code + '_' + isp
				}
				combos.push(comboObject)
			})
		})
		return combos
	}
	function requestCityData(city, dataType, callback) {
		var dataObj = null;
		if(dataType === 'hourly') {
			dataObj = hourlyDataByCode;
		} else if(dataType === 'daily') {
			dataObj = dailyDataByCode;
		} else {
			console.error('invalid data requested: ' + dataType)
			return
		}
		var combos = getCombinations(city);
		var numCombosLoaded = 0;
		_.each(combos, function(combo) {
			if(typeof dataObj[combo.filename] === 'undefined') {
				//request data
				var requestData = {}
				requestData.requested = true;
				requestData.received = false;
				requestData.callbacks = []
				requestData.callbacks.push(callback)
				dataObj[combo.filename] = requestData
				d3.csv(dataPath + combo.filename + '_' + dataType + '.csv', function(err, data) {
					requestData.received = true
					setupDates(data, dataType)
					requestData.filenameID = combo.filename
					requestData.data = data
					//console.log(combo.filename)
					//console.log(requestData)
					numCombosLoaded ++;
					checkIfAllDataLoaded(numCombosLoaded, combos, requestData.callbacks, dataObj)
					/*
					if(numCombosLoaded === combos.length) {
						var rtnObj = [];
						_.each(combos, function(c) {
							rtnObj.push(dataObj[c.filename])
						})
						callback(rtnObj)
					}
					*/
				})
			} else {
				//data has either been requested and we are waiting for a response
				//or data has been requested and received
				var requestData = dataObj[combo.filename]
				if(! requestData.received) {
					//data requested but not received
					requestData.callbacks.push(callback)
				} else {
					//data already received
					numCombosLoaded++
					checkIfAllDataLoaded(numCombosLoaded, combos, [callback], dataObj)

				}
			} 
		})
	}
	function checkIfAllDataLoaded(numLoaded, combos, callbacks, dataObj) {
		var numExpected = combos.length
		if(numLoaded === numExpected) {
			var rtnObj = [];
			_.each(combos, function(c) {
				rtnObj.push(dataObj[c.filename])
			})
			_.each(callbacks, function(callback) {
				callback(rtnObj)
			})
		}
	}
	function setupDates(data, dataType) {
		_.each(data, function(datum) {
			var date;
			if(dataType === 'hourly') {
				//dunno
				console.error('setup hourly data')
			} else if(dataType === 'daily') {
				date = new Date(datum['year'], datum['month'] - 1, datum['day'])
			}
			datum.date = date
		})
	}
	exports.init = init
	exports.getMetrics = function() { return metrics }
	exports.getCities = function() { return validCities }
	exports.getCombinations = getCombinations
	exports.requestCityData = requestCityData
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}

	window.mlabOpenInternet.dataLoader = exports;
	/*
	function init() {

		d3.csv(ispFile, function(data){
			_.each(data, function(datum){
				ispList.push(datum.ISP);
			});

			d3.csv(mapFile, function(map){
				_.each(map, function(mp){
					var siteCode = mp.MlabSiteName.toLowerCase();
					var cityState = mp.City + ', ' + mp.State;
					codeList.push(siteCode);
					codeCity[siteCode] = cityState; 
					codeTP[siteCode] = mp.TransitProvider;
					if(!(cityState in cityCode))
						cityCode[cityState] = [siteCode];
					else if (cityCode[cityState].indexOf(siteCode) == -1)
						cityCode[cityState].push(siteCode);
				});
				return calDataPathNum();
			});
		});
	}

	function calDataPathNum() {
		var cnt = 0;
		for(var i = 0; i < years.length; i++){
			for(var j = 0; j < codeList.length; j++){
				for(var k = 0; k < ispList.length; k++){
					var path = dataPath + years[i] + "-01-01-000000+" + ynums[i] + "d_" + codeList[j] + "_" + ispList[k] + "_agg.csv";
					pathList.push(path);
					dataAccessMap[years[i] + "-" + codeList[j] + "-" + ispList[k]] = cnt;
					cnt++;
				}
			}
		}
		return loadAggData(0);
	}

	function loadAggData(counter){
		// if(counter == pathList.length)
		if(counter == 112)
			return mlabOpenInternet.app.update();
		d3.csv(pathList[counter], function(error, data){
			var tmpHourly = [];
			var tmpDaily = [];
			if(!error){
				_.each(data, function(datum){
					if(datum['hour'] == "-99")
						tmpDaily.push(datum);
					else
						tmpHourly.push(datum);						
				});
			}
			aggDailyData.push(tmpDaily);
			aggHourlyData.push(tmpHourly);
			loadAggData(++counter);
		});
	}

	function getISPList(){
		return ispList;
	}

	function getCodeList(){
		return codeList;
	}

	function getCodeCity(){
		return codeCity;
	}

	function getCodeTP(){
		return codeTP;
	}
				
	function getCityCode(){
		return cityCode;
	}

	function getDataAccessMap(){
		return dataAccessMap;
	}

	function getAggDailyData(){
		return aggDailyData;
	}

	function getAggHourlyData(){
		return aggHourlyData;
	}

	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}

	window.mlabOpenInternet.dataLoader = {
		init: init,
		getISPList: getISPList,
		getCodeList: getCodeList,
		getCodeCity: getCodeCity,
		getCodeTP: getCodeTP,
		getCityCode: getCityCode,
		getDataAccessMap: getDataAccessMap,
		getAggDailyData: getAggDailyData,
		getAggHourlyData: getAggHourlyData
	}
	*/
})()