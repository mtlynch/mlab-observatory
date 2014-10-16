(function() {
	var colors = [
		"#4bb84b", "#dc4d3b", "#997edf", "#a3417f", "#548bd7", "#bdcb29", "#d68a1e",
		"#93d493", "#ea9489", "#c2b2ec", "#c88db2", "#98b9e7", "#d7e07f", "#e6b978"
	]
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
	var validMetroRegions = []
	var siteMappings = null;
	var metrics = null;
	var dailyDataByCode = {};
	var hourlyDataByCode = {};
	var mlabSitesByCode = {}
	var minSampleSize = 50
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
			var metro = mapping['MetroArea']
			if(validMetroRegions.indexOf(metro) === -1) {
				validMetroRegions.push(metro)
			}
			var code = mapping['MlabSiteName'].toLowerCase()
			mlabSitesByCode[code] = mapping
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
	function getCombinations(metro) {
		var mLabSites = _.select(siteMappings, function(d) { return d.MetroArea === metro })
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
	function requestMetroData(metro, dataType, callback) {
		var dataObj = null;
		if(dataType === 'hourly') {
			dataObj = hourlyDataByCode;
		} else if(dataType === 'daily') {
			dataObj = dailyDataByCode;
		} else {
			console.error('invalid data requested: ' + dataType)
			return
		}
		var combos = getCombinations(metro);
		console.log(combos)
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
					requestData.data = setupDates(data, dataType)
					requestData.filenameID = combo.filename
					requestData.color = colors[~~ ( Math.random() * colors.length) ]
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
		var minDate = null;
		var maxDate = null;
		_.each(data, function(datum) {
			var date;
			if(dataType === 'hourly') {
				//dunno
				console.error('setup hourly data')
			} else if(dataType === 'daily') {
				date = new Date(datum['year'], datum['month'] - 1, datum['day'])
			}
			datum.date = date
			datum.moment = moment(date);
			if(minDate === null || date < minDate) {
				minDate = date
			}
			if(maxDate === null || date > maxDate) {
				maxDate = date
			}
		})
		if(dataType === 'hourly') {
			console.error('setup hourly data')
		} else {

			console.log(minDate + ' ' + maxDate)
			var momentMin = moment(minDate)
			var momentMax = moment(maxDate)
			//sort data
			data.sort(function(a,b) {
				if(a.date > b.date) {
					return 1
				} else if(a.date < b.date) {
					return -1;
				} else {
					return 0
				}
			})
			var numDays = momentMax.diff(momentMin, 'days', true) + 1
			console.log( numDays)

			var dataWithGaps = new Array(numDays)
			_.each(data, function(datum) {
				var dayCount = datum.moment.diff(momentMin,'days', true)
				dataWithGaps[dayCount] = datum;
			})
			for(var i = 0; i < dataWithGaps.length; i++) {
				var datum = dataWithGaps[i];
				if(typeof datum === 'undefined') {
					var previous = dataWithGaps[i - 1]
					var fakeMomentDate = previous.moment.clone()
					fakeMomentDate.add(1,'days')
					var fakeDate = fakeMomentDate.toDate()
					var fakeData = {
						month: fakeMomentDate.month() + 1,
						day: fakeMomentDate.date(),
						year: fakeMomentDate.year()
					}
					fakeData.date = fakeDate
					fakeData.moment = fakeMomentDate
					_.each(metrics, function(metric) {
						fakeData[metric.key] = 0
						fakeData[metric.key + '_n'] = 0
					})
					dataWithGaps[i] = fakeData
				}
			}
			return dataWithGaps

		}
	}
	function getTPForCode(code) {
		var mapping = mlabSitesByCode[code]
		return mapping['TransitProvider']
	}
	exports.init = init
	exports.getMetrics = function() { return metrics }
	exports.getMetroRegions = function() { return validMetroRegions }
	exports.getCombinations = getCombinations
	exports.requestMetroData = requestMetroData
	exports.getTPForCode = getTPForCode
	exports.getMinSampleSize = function() { return minSampleSize }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}

	window.mlabOpenInternet.dataLoader = exports;
	
})()