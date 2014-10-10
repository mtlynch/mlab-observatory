(function() {
	var margin = {top: 10, right: 20, bottom: 25, left: 80}
	var exploreDimensions = {
		w: 824 - margin.left - margin.right,
		h: 441 - margin.top - margin.bottom
	}
	
	var svg;
	var div;
	var colors = [
		"#4bb84b", "#dc4d3b", "#997edf", "#a3417f", "#548bd7", "#bdcb29", "#d68a1e",
		"#93d49c", "#eq9489", "#c2b2ec", "#c88db2", "#98b9e7", "#d7e07f", "#efb978"
	]
	function init() {
		div = d3.select('#exploreViz')
		svg = div.append('svg')
			.attr('width', exploreDimensions.w + margin.left + margin.right)
			.attr('height', exploreDimensions.h + margin.top + margin.bottom)
		chart = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		chart.append('g').attr('class','lines')

	}
	function show() {
		var curCity = mlabOpenInternet.controls.getSelectedCity()
		var view = 'daily'
		mlabOpenInternet.dataLoader.requestCityData(curCity, view, dataLoaded)
		
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
			dataInTimePeriod.push({data: timelyData, id: dataset.filenameID})
		})
		plot(dataInTimePeriod)
	}
	function plot(datasets) {
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		var selectedCombinations = mlabOpenInternet.controls.getSelectedCombinations()
		var metricKey = metric.key;
		var minDataValue = Number.MAX_VALUE;
		var maxDataValue = -Number.MIN_VALUE;
		var maxDatasetLength = 0;
		var minDate = null;
		var maxDate = null;
		console.log(datasets)
		_.each(datasets, function(dataset) {
			_.each(dataset.data, function(datum) {
				var metricValue = +datum[metricKey]
				if(metricValue < minDataValue) {
					minDataValue = metricValue
				}
				if(metricValue > maxDataValue) {
					maxDataValue = metricValue
				}
				if(minDate === null || datum.date < minDate) {
					minDate = datum.date
				}
				if(maxDate === null || datum.date > maxDate) {
					maxDate = datum.date
				}
			})
		})
		console.log(minDataValue + ' ' + maxDataValue)
		console.log(minDate + " " + maxDate)
		var yScale = d3.scale.linear().domain([0, maxDataValue])
			.range([exploreDimensions.h, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		var xScale = d3.time.scale().domain([minDate, maxDate]).range([0, exploreDimensions.w])
		var paths = svg.select('g.lines').selectAll('path').data(datasets)
		var lineGen = d3.svg.line()
			.x(function(d,i) {
				return xScale(d.date)
			})
			.y(function(d,i) {
				return yScale(d[metricKey])
			})
		paths.enter().append('path');
		paths.exit().remove()
		paths.attr('d', function(d) {
			return lineGen(d.data) 
		}).style('stroke', function(d,i) {
			var active = _.find(selectedCombinations, function(combo) {
				return combo.filename === d.id
			})
			if(typeof active === 'undefined') {
				d.active = false
				return null
			} else {
				d.active = true;
				return colors[~~(Math.random() * colors.length)]
			}
		}).style('stroke-width', function(d) {
			if(d.active) {
				return '3px'
			} else {
				return null
			}
		})
		_.each(datasets, function(dataset) {
			if(dataset.length < maxDatasetLength) {
				console.error('dataset missing xvalues, x scale will be off')
			}
		})
		chart.selectAll('.axis').remove()
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom')
			.tickFormat(d3.time.format("%m-%d"));

		chart.append('g').attr('class','xAxis axis').attr('transform', 'translate(0,' + exploreDimensions.h +')')
			.call(xAxis)

		var yAxis = d3.svg.axis().scale(yScale).orient('left')
			.tickFormat(function(d) {
				return d + ' ' + metric.units
			})
		chart.append('g').attr('class','yAxis axis').call(yAxis)

	}

	if( ! window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.exploreViz = {
		init: init,
		show: show
    }
})()
