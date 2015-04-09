/*
file that handles all data loading
*/
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
  var regionsToIgnore = ['Washington DC']
  var filenameToColorMap = {}
  var loadingDiv;

  //kick off data loading
  function init() {
    loadingDiv = d3.select('#loading')
    loadingDiv.append('img').attr('src', 'static/observatory/images/loading.gif')
    d3.json(metadatafolder + 'ispMap.json', loadISPNameMap)
  }
  /*
  load the isp names
  */
  function loadISPNameMap(err, map) {
    ispNameMap = map;
    d3.json(metadatafolder + "colors.json", loadColors)
  }
  /*
  load isp colors
  */
  function loadColors(err, colors) {
    colorMap = colors
    d3.xhr(validExploreCodesFile, loadExploreCodes)
  }
  /*
  load the valid explore combiations
  */
  function loadExploreCodes(err, data) {
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
    validISPs.sort(function(a,b) {
      return a > b
    })
    d3.xhr(validCompareCodesFile, loadCompareCodes)

  }
  /*
  load the valid compare combinations
  */
  function loadCompareCodes(err, data) {
    var response = data.response.split('\n')
    _.each(response, function(code) {
      if(code !== '') {
        validCompareCodes.push(code)
      }
    })
    d3.csv(mapFile, loadCodeMappings)
  }
  /*
  load data describing each mlab site
  */
  function loadCodeMappings(err, data) {
    siteMappings = data;
    _.each(data, function(mapping) {
      var metro = mapping['MetroArea']
      var code = mapping['MlabSiteName'].toLowerCase()
      var codePrefix = code.substr(0,3)
      if(validMetroRegions.indexOf(metro) === -1) {
        if(regionsToIgnore.indexOf(metro) === -1) {
          validMetroRegions.push(metro)
          metroRegionToMLabPrefix[metro] = codePrefix
        }
      }
      mlabSitesByCode[code] = mapping
    })
    validMetroRegions.sort(function(a,b) {
      return a > b
    })

    d3.json(metricFile, loadMetrics);
  }
  /*
  load names and metadata about each metric
  */
  function loadMetrics(err, data) {
    if(err) {
      console.error('error loading metrics file')
      console.log(err);
      return
    }
    metrics = data;
    metrics.sort(function(a,b) {
      return a.name > b.name
    })
    loadingDiv.style('display','none')
    exports.emitEvent('loaded')
  }

  /*
  method to indicate which IPxTSP combo is valid for given metro region
  */
  function getCombinations(metro) {
    var mLabSites = _.select(siteMappings, function(d) { return d.MetroArea === metro })
    var combos = []
    var labels = []
    _.each(mLabSites, function(site) {
      var code = site.MlabSiteName.toLowerCase()
      var siteISPs = ispsBySite[code]
      _.each(siteISPs, function(isp) {
        var ispLabel = isp;
        if(typeof ispNameMap[ispLabel] !== 'undefined') {
          ispLabel = ispNameMap[ispLabel]
        }
        var label =  ispLabel + ' x ' + site.TransitProvider
        labels.push(label)
        var comboObject = {
          label: label,
          filename: code + '_' + isp
        }
        combos.push(comboObject)
      })
    })
    combos.sort(function(a,b) {
      if(a.label === b.label) {
        return 0
      } else if(a.label > b.label) {
        return 1
      } else {
        return -1;
      }
    })
    labels.sort();
    //console.log(labels)
    //console.log(combos)
    return combos
  }

  /*
  data loader for explore visuals

  requires a given metro
  and a dataType, either 'daily' or 'hourly'
  also takes a callback function that is called with an array of the requested data
  */
  function requestMetroData(metro, dataType, callback) {
    //console.log('request metro')
    //console.log(metro)
    //console.log(dataType)
    loadingDiv.style('display','block')
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
    //console.log(combos)
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
          filenameToColorMap[combo.filename] = requestData.color
          //console.log(combo.filename)
          //console.log(requestData)
          numCombosLoaded ++;
          checkIfAllDataLoaded(numCombosLoaded, combos, requestData.callbacks, dataObj, dataType)
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

  /*
  requests compare data based on current selection

  aggregationSelection is the currently selected ISP or selected Metro
  viewType defines if we are comparing by Metro Region or by ISP
  dataType again defines 'daily' or 'hourly' data
  callback again gets passed the data once it is ready
  */
  function requestCompareData(aggregationSelection, viewType, dataType, callback) {
    //console.log(viewType)
    //console.log(aggregationSelection)
    //console.log(validMetroRegions)

    loadingDiv.style('display','block')
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
    //console.log(dataToLoad)

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

  /*
  determines if all the data that has been requested has been loaded.

  if it has, we ensure there are no gaps in the data
  and then pass that data to our callback
*/
  function checkIfAllDataLoaded(numLoaded, combos, callbacks, dataObj, dataType) {
    var numExpected = combos.length
    if(numLoaded === numExpected) {
      var rtnObj = [];
      _.each(combos, function(c) {
        rtnObj.push(dataObj[c.filename])
      })
      //console.log(dataType)
      if(typeof dataType !== 'undefined') {
        //console.log(rtnObj)
        var dateRange = dateExtent(rtnObj, dataType)
        //console.log(dateRange)
        _.each(rtnObj, function(dataset) {
          if(typeof dataset.dateShifted === 'undefined') {
            dataset.data = setupDates(dataset.data, dataType, dateRange[0], dateRange[1])
          }
        })
      }

      loadingDiv.style('display','none')
      _.each(callbacks, function(callback) {
        callback(rtnObj)
      })
    }
  }

  /*
  determines the date range of the current datasets
  */
  function dateExtent(datasets, dataType) {
    var minDate = null;
    var maxDate = null;
    _.each(datasets, function(dataset) {
      _.each(dataset.data, function(d) {
        var date = null
        if(dataType === 'hourly') {
          date = new Date(d['year'], d['month'] - 1, 1, d['hour'])
        } else if(dataType === 'daily') {
          date = new Date(d['year'], d['month'] - 1, d['day'])
        }
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

  /*
  fills in any gaps in the date ranges
  */
  function setupDates(data, dataType, minDate,maxDate) {
    _.each(data, function(datum) {
      var date;
      if(dataType === 'hourly') {
        date = new Date(datum['year'], datum['month'] - 1, 1, datum['hour'])
      } else if(dataType === 'daily') {
        date = new Date(datum['year'], datum['month'] - 1, datum['day'])
      }
      datum.date = date
      datum.moment = moment(date);
    })
    function dateSort(a,b) {
      if(a.date > b.date) {
        return 1
      } else if(a.date < b.date) {
        return -1;
      } else {
        return 0
      }
    }
    //console.log(minDate, maxDate)
    if(dataType === 'hourly') {
      var momentMin = moment(minDate);
      var momentMax = moment(maxDate);
      data.sort(dateSort)
      var numHours = momentMax.diff(momentMin, 'hours', true)
      // console.log(minDate);
      // console.log(maxDate)
      // console.log('num hours ' + numHours)
      return data
    } else {

      var momentMin = moment(minDate)
      var momentMax = moment(maxDate)
      //console.log(minDate + " " + maxDate)
      //sort data
      data.sort(dateSort)
      var numDays = momentMax.diff(momentMin, 'days', true) + 1
      //console.log('num days ' + numDays)
      var dataWithGaps = new Array(numDays)
      _.each(data, function(datum) {
        var dayCount = datum.moment.diff(momentMin,'days', true)
        if(dayCount < numDays) {
          dataWithGaps[dayCount] = datum;
        }
      })
      //console.log(dataWithGaps.length)
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
  /*
  ensures if there are any missing metrics, we fill them in with dummy data
  */
  function checkMetrics(data) {
    _.each(data, function(d) {
      _.each(metrics, function(metric) {
        if(isNaN(+d[metric.key])) {
          d[metric.key] = 0
        }
      })
    })
  }
  /*
  gets the Transit Provider data for a given TP code
  */
  function getTPForCode(code) {
    var mapping = mlabSitesByCode[code]
    return mapping['TransitProvider']
  }
  /*
  gets a defined coloring for the given dataset by filename
  */
  function getColorForFilename(filename) {
    return filenameToColorMap[filename]
  }
  /* various getters for the loaded data
  */
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
  exports.getMetroRegionToCodeMap = function() { return metroRegionToMLabPrefix }
  exports.getColorForFilename = getColorForFilename
  if( ! window.mlabOpenInternet){
    window.mlabOpenInternet = {}
  }
  window.mlabOpenInternet.dataLoader = exports;
})()
