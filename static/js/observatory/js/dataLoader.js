(function() {
	var colorMap;
	var exports = new EventEmitter()
	var metadatafolder = 'static/observatory/metadata/'

	var mapFile = metadatafolder + "codeMap.csv"
	var validExploreCodesFile = metadatafolder + 'validExploreKeys.txt'
	var validCompareCodesFile = metadatafolder + 'validCompareKeys.txt'
	var metricFile = metadatafolder + 'metrics.json'

	var dataPath = "static/observatory/data/"
	var validExploreCodes = [];
	var validCompareCodes = []
	var ispsBySite = {}
	var validISPs = [];
	var validSiteNames = [];
	var validMetroRegions = []
	var metroRegionToMLabPrefix = {}
	var siteMappings = null;
	var metrics = null;
	var dailyDataByCode = {};
	var hourlyDataByCode = {};
	var dailyCompareDataByCode = {};
	var hourlyCompareDataByCode = {};
	var mlabSitesByCode = {}
	var ispNameMap;
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
		d3.json(metadatafolder + 'ispMap.json', loadISPNameMap)
	}
	function loadISPNameMap(err, map) {
		ispNameMap = map;
		d3.json(metadatafolder + "colors.json", loadColors)
	}
	function loadColors(err, colors) {
		colorMap = colors
		d3.xhr(validExploreCodesFile, loadExploreCodes)
	}
	function loadExploreCodes(err, data) {
		console.log(data)
		var response = data.response.split('\n')
		_.each(response, function(code) {
			if(code === '') {
				return;
			}
			validExploreCodes.push(code)
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
		d3.xhr(validCompareCodesFile, loadCompareCodes)

	}
	function loadCompareCodes(err, data) {
		var response = data.response.split('\n')
		_.each(response, function(code) {
			if(code !== '') {
				validCompareCodes.push(code)
			}
		})
		d3.csv(mapFile, loadCodeMappings)
	}

	function loadCodeMappings(err, data) {
		siteMappings = data;
		_.each(data, function(mapping) {
			var metro = mapping['MetroArea']
			var code = mapping['MlabSiteName'].toLowerCase()
			var codePrefix = code.substr(0,3)
			if(validMetroRegions.indexOf(metro) === -1) {
				validMetroRegions.push(metro)
				metroRegionToMLabPrefix[metro] = codePrefix
			}
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
				var ispLabel = isp;
				if(typeof ispNameMap[ispLabel] !== 'undefined') {
					ispLabel = ispNameMap[ispLabel]
				}
				var comboObject = {
					label: ispLabel + ' x ' + site.TransitProvider,
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
				d3.csv(dataPath + 'exploreData/' + combo.filename + '_' + dataType + '.csv', function(err, data) {
					requestData.received = true
					checkMetrics(data)
					requestData.data = data
					requestData.filenameID = combo.filename
					var filenameParts = combo.filename.split('_')
					var isp = filenameParts[1];
					var mlabID = filenameParts[0];
					var mlabIndex = (+(mlabID.substr(3))) - 1
					requestData.color = '#' + colorMap[isp][mlabIndex]
					//console.log(combo.filename)
					//console.log(requestData)
					numCombosLoaded ++;
					checkIfAllDataLoaded(numCombosLoaded, combos, requestData.callbacks, dataObj, dataType)
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
	function requestCompareData(aggregationSelection, viewType, dataType, callback) {
		console.log(viewType)
		console.log(aggregationSelection)
		console.log(validMetroRegions)
		var dataToLoad = [];
		if(viewType === 'Metro Region') {
			var prefix = metroRegionToMLabPrefix[aggregationSelection].toUpperCase()
			_.each(validCompareCodes, function(compareCode) {
				if(compareCode.indexOf(prefix) === 0) {
					dataToLoad.push({
						filename: compareCode
					})
				}
			})
		} else if(viewType === 'ISP') {
			_.each(validCompareCodes, function(compareCode) {
				if(compareCode.indexOf(aggregationSelection) !== -1) {
					dataToLoad.push({ filename: compareCode })
				}
			})
		}
		console.log(dataToLoad)


		var dataObj = null;
		if(dataType === 'hourly') {
			dataObj = hourlyCompareDataByCode;
		} else if(dataType === 'daily') {
			dataObj = dailyCompareDataByCode;
		} else {
			console.error('invalid data requested: ' + dataType)
			return
		}
		var numFilesLoaded = 0;
		_.each(dataToLoad, function(datum) {
			if(typeof dataObj[datum.filename] === 'undefined') {
				//request data
				var requestData = {}
				requestData.requested = true;
				requestData.received = false;
				requestData.callbacks = []
				requestData.callbacks.push(callback)
				dataObj[datum.filename] = requestData
				d3.csv(dataPath + 'compareData/' + datum.filename + '_' + dataType + '.csv', function(err, data) {
					requestData.received = true
					checkMetrics(data)
					requestData.data = data
					requestData.filenameID = datum.filename
					var filenameParts = datum.filename.split('_')
					var isp = filenameParts[1]
					requestData.color = '#' + colorMap[isp][0]
					//console.log(requestData)
					numFilesLoaded ++;
					checkIfAllDataLoaded(numFilesLoaded, dataToLoad, requestData.callbacks, dataObj, dataType)
					
				})
			} else {
				//data has either been requested and we are waiting for a response
				//or data has been requested and received
				var requestData = dataObj[datum.filename]
				if(! requestData.received) {
					//data requested but not received
					requestData.callbacks.push(callback)
				} else {
					//data already received
					numFilesLoaded++
					checkIfAllDataLoaded(numFilesLoaded, dataToLoad, [callback], dataObj)

				}
			} 
		})

	}
	function checkIfAllDataLoaded(numLoaded, combos, callbacks, dataObj, dataType) {
		var numExpected = combos.length
		if(numLoaded === numExpected) {
			var rtnObj = [];
			_.each(combos, function(c) {
				rtnObj.push(dataObj[c.filename])
			})
			console.log(dataType)
			if(typeof dataType !== 'undefined') {
				console.log(rtnObj)
				var dateRange = dateExtent(rtnObj)
				console.log(dateRange)
				_.each(rtnObj, function(dataset) {
					dataset.data = setupDates(dataset.data, dataType, dateRange[0], dateRange[1])
				})
			}
			_.each(callbacks, function(callback) {
				callback(rtnObj)
			})
		}
	}
	function dateExtent(datasets, dataType) {
		var minDate = null;
		var maxDate = null;
		if(dataType === 'hourly') {
			console.error('hourly not setup')
		}
		_.each(datasets, function(dataset) {
			_.each(dataset.data, function(d) {
				var date = new Date(d['year'], d['month'] - 1, d['day'])
				if(minDate === null || date < minDate) {
					minDate = date;
				}
				if(maxDate === null || date > maxDate) {
					maxDate = date;
				}
			})
		})

		return [minDate, maxDate]
	}
	function setupDates(data, dataType, minDate,maxDate) {
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
		})
		console.log(minDate, maxDate)
		if(dataType === 'hourly') {
			console.error('setup hourly data')
		} else {

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
		
			var dataWithGaps = new Array(numDays)
			_.each(data, function(datum) {
				var dayCount = datum.moment.diff(momentMin,'days', true)
				dataWithGaps[dayCount] = datum;
			})
			for(var i = 0; i < dataWithGaps.length; i++) {
				var datum = dataWithGaps[i];
				if(typeof datum === 'undefined') {
					var previous = dataWithGaps[i - 1]
					var fakeMomentDate;
					if(typeof previous === 'undefined') {
						fakeMomentDate = moment(minDate)
					} else {
						fakeMomentDate = previous.moment.clone()
					}
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
	function checkMetrics(data) {
		_.each(data, function(d) {
			_.each(metrics, function(metric) {
				if(isNaN(+d[metric.key])) {
					d[metric.key] = 0
				}
			})
		})
	}
	function getTPForCode(code) {
		var mapping = mlabSitesByCode[code]
		return mapping['TransitProvider']
	}
	exports.init = init
	exports.getMetrics = function() { return metrics }
	exports.getMetroRegions = function() { return validMetroRegions }
	exports.getISPs = function() { return validISPs }
	exports.getCombinations = getCombinations
	exports.requestMetroData = requestMetroData
	exports.requestCompareData = requestCompareData
	exports.getTPForCode = getTPForCode
	exports.getMinSampleSize = function() { return minSampleSize }
	exports.getColors = function() { return colorMap }
	exports.getISPNameMap = function() { return ispNameMap }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}

	window.mlabOpenInternet.dataLoader = exports;
	
})()