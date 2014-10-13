(function() {
	var exports = new EventEmitter()
	var div;

	var startDate = moment(new Date(2012, 0, 1));
	var endDate = moment(new Date(2014, 7, 1))

	var selectedDate;
	var dateOptions;
	var svg;
	var svgDimensions = {
		height: 40,
		width: 822
	}
	var linesTranslateData;
	function init() {
		div = d3.select('#timeControl')
		svg = div.append('svg').attr('width', svgDimensions.width).attr('height', svgDimensions.height)
		svg.append('g').attr('class','lines')

		//les just make it simple for now


		var opts = [];
		var curTime = endDate;
		while(curTime >= startDate) {
			var dateO = {
				label: curTime.format('MMMM YYYY'),
				date: curTime.clone()
			}
			opts.push(dateO)
			curTime.subtract(1,'months')
		}
		console.log(opts)
		dateOptions = opts;
		var select = div.append('select')
		var options = select.selectAll('option').data(opts)
		options.enter().append('option')
		options.attr('value', function(d,i) {
			return d.label
		}).text(function(d) { return d.label })

		$(select[0][0]).on('change', timeChanged)

		selectedDate = opts[0]
	}
	function show() {
		var curCity = mlabOpenInternet.controls.getSelectedCity()
		var view = 'daily'
		mlabOpenInternet.dataLoader.requestCityData(curCity, view, dataLoaded)
	}
	function dataLoaded(allCityData) {
		console.log('time control data loaded')
		var datasets;
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		var selectedCombinations = mlabOpenInternet.controls.getSelectedCombinations()
		if(selectedCombinations.length === 0) {
			datasets = allCityData
		} else {
			datasets = []
			_.each(allCityData, function(cityData) {
				var dataID = cityData.filenameID;
				var included = _.find(selectedCombinations, function(combo) { return combo.filename === dataID })
				if(typeof included !== 'undefined') {
					datasets.push(cityData)
				}
			})
			console.log(selectedCombinations)
		}
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
			.range([svgDimensions.height, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		var monthsToShowAtOnce = 6;
		var monthWidth = svgDimensions.width / monthsToShowAtOnce;
		var startDateMoment = moment(minDate);
		var endDateMoment = moment(maxDate)
		var numMonths = endDateMoment.diff(startDateMoment, 'months')
		var fullWidth = monthWidth * numMonths;
		console.log('numMonths ' + numMonths)
		var xScale = d3.time.scale().domain([minDate, maxDate]).range([0, fullWidth])
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
			if(selectedCombinations.length === 0) {
				return null
			}
			return d.color
		})
		var maxTranslateAmount = -(fullWidth - svgDimensions.width);
		var drag = d3.behavior.drag()
			.on('dragstart', function(d) {
				linesTranslateData.dx = 0
			}).on('dragend', function(d) {
				linesTranslateData.dx = 0
			})
			.on('drag', function(d) {
				var delta = d3.event.dx;
				linesTranslateData.dx += delta;
				console.log(linesTranslateData.dx)
				if(Math.abs(linesTranslateData.dx) < monthWidth) {
					return;
				}
				var monthsToShift = ~~(linesTranslateData.dx / monthWidth)
				var shiftAmount = monthsToShift * monthWidth
				console.log(monthsToShift + " "  + shiftAmount);
				linesTranslateData.dx -= shiftAmount
				var sign = delta > 0 ? 1 : -1;
				linesTranslateData.x += shiftAmount ;
				if(linesTranslateData.x > 0) {
					linesTranslateData.x = 0
				}
				if(linesTranslateData.x < maxTranslateAmount) {
					linesTranslateData.x = maxTranslateAmount
				}
				d3.select(this).select('g.lines')
					.attr('transform', 'translate(' + linesTranslateData.x + ',' + linesTranslateData.y + ')')
			}).origin(function(d) { return linesTranslateData })
		var linesTranslateData = {
			x: maxTranslateAmount, y: 0, dx: 0
		}
		svg.select('g.lines').datum(linesTranslateData).attr('transform', function(d) {
			return 'translate(' + d.x + ',' + d.y + ')'
		})
		svg.call(drag)

	}
	function timeChanged(e) {
		console.log('time changed');
		console.log(e)
		selectedDate = _.find(dateOptions, function(d) {
			return d.label === $(e.currentTarget).val()
		});
		console.log(selectedDate)
		exports.emitEvent('selectionChanged')


	}
	exports.init = init
	exports.show = show
	exports.getSelectedDate = function() { return selectedDate }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.timeControl = exports;
	
})()