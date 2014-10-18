(function() {
	var margin = {top: 0, right: 0, bottom: 0, left: 0}
	var dimensions = {
		w: 824 - margin.left - margin.right,
	}
	
	var eachGraphHeight = 120;
	var svg;
	var div;
	var curMetric;
	var curViewType;
	function init() {
		div = d3.select('#compareViz')
		svg = div.append('svg')
			.attr('width', dimensions.w + margin.left + margin.right)

	}
	function show() {
		div.style('display', null)
		curViewType = mlabOpenInternet.controls.getCompareByView()
		var aggregationSelection = mlabOpenInternet.controls.getCompareAggregationSelection()
		console.log(aggregationSelection)
		var view = 'daily'
		mlabOpenInternet.dataLoader.requestCompareData(aggregationSelection, curViewType, view, dataLoaded)
		
	}
	function dataLoaded(allCityData) {
		console.log('all city data loaded')
		console.log(allCityData)
		var dataInTimePeriod = []
		var curDate = mlabOpenInternet.timeControl.getSelectedDate()
		var dateToMatch = {
			month: curDate.date.month() + 1,
			year: curDate.date.year()
		}
		//console.log(dateToMatch)

		_.each(allCityData, function(dataset) {
			console.log(dataset)
			var timelyData = _.filter(dataset.data, function(d) {
				return d.month == dateToMatch.month && d.year == dateToMatch.year
			})
			//console.log(timelyData)
			dataInTimePeriod.push({data: timelyData, id: dataset.filenameID, color: dataset.color})
		})
		console.log(dataInTimePeriod)
		plot(dataInTimePeriod)
	}
	function plot(datasets) {
		var fullHeight = datasets.length * eachGraphHeight
		console.log(fullHeight)
		svg.attr('height', fullHeight)
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		curMetric = metric;
		var metricKey = metric.key;
		var minDataValue = Number.MAX_VALUE;
		var maxDataValue = -Number.MIN_VALUE;
		var maxDatasetLength = 0;
		var minDate = null;
		var maxDate = null;
		console.log(datasets)
		_.each(datasets, function(dataset) {
			_.each(dataset.data, function(datum) {
				if(minDate === null || datum.date < minDate) {
					minDate = datum.date
				}
				if(maxDate === null || datum.date > maxDate) {
					maxDate = datum.date
				}
				var sampleSize = +datum[metricKey + "_n"]
				if(sampleSize < mlabOpenInternet.dataLoader.getMinSampleSize()) {
					return
				}
				var metricValue = +datum[metricKey]
				if(metricValue < minDataValue) {
					minDataValue = metricValue
				}
				if(metricValue > maxDataValue) {
					maxDataValue = metricValue
				}
			})
		})
		console.log(minDataValue + " " + maxDataValue)

		var yScale = d3.scale.linear().domain([0, maxDataValue])
			.range([eachGraphHeight, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		var xScale = d3.time.scale().domain([minDate, maxDate]).range([0, dimensions.w])
		var datasetGroups = svg.selectAll('g.dataset').data(datasets)
		datasetGroups.enter().append('g').attr('class','dataset')
		datasetGroups.exit().remove()
		datasetGroups.attr("transform",function(d,i) {
			var y = i * eachGraphHeight
			var x = 0
			return 'translate(' + x + ',' + y + ')'
		})
		var paths = datasetGroups.selectAll('path').data(function(d) { return [d] })
		var lineGen = d3.svg.line()
			.x(function(d,i) {
				return xScale(d.date)
			})
			.y(function(d,i) {
				var yVal = yScale(d[metricKey])
				if(isNaN(yVal)) {
					console.log('nan')
					console.log(d)
				}
				return yScale(d[metricKey])
			}).defined(function(d,i) {
				return d[metricKey+"_n"] >= mlabOpenInternet.dataLoader.getMinSampleSize()
			})
		var dotData = []
		paths.enter().append('path');
		paths.exit().remove()
		paths.attr('d', function(d) {
			return lineGen(d.data) 
		}).style('stroke', function(d,i) {
			return null
			var active = _.find(selectedCombinations, function(combo) {
				return combo.filename === d.id
			})
			if(typeof active === 'undefined') {
				d.active = false
				return null
			} else {
				d.active = true;
				console.log('active dataset');
				console.log(d)

				_.each(d.data, function(dotDataPoint) {
					dotDataPoint.dataID = d.id
					dotDataPoint.color = d.color
					dotData.push(dotDataPoint)
				})
				return d.color;
			}
		}).style('stroke-width', function(d) {
			if(d.active) {
				return '3px'
			} else {
				return null
			}
		})

		var lineTickLines = [0, 0.5, 1]
		datasetGroups.selectAll('line.tick')

	}
	function hide() {
		div.style('display','none')
	}
	if( ! window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.compareViz = {
		init: init,
		show: show,
		hide: hide
    }
})()
