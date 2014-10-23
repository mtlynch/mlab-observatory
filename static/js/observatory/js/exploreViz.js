(function() {
	var margin = {top: 10, right: 20, bottom: 25, left: 60}
	var exploreDimensions = {
		w: 824 - margin.left - margin.right,
		h: 441 - margin.top - margin.bottom
	}
	
	var svg;
	var div;
	var exploreTT;
	var curMetric;
	var xScale, yScale;
	var colors = [
		"#4bb84b", "#dc4d3b", "#997edf", "#a3417f", "#548bd7", "#bdcb29", "#d68a1e",
		"#93d49c", "#eq9489", "#c2b2ec", "#c88db2", "#98b9e7", "#d7e07f", "#efb978"
	]
	function init() {
		div = d3.select('#exploreViz')
		exploreTT = div.append('div').attr('class','exploreTTContainer')
		exploreTT.call(createTT)
		svg = div.append('svg')
			.attr('width', exploreDimensions.w + margin.left + margin.right)
			.attr('height', exploreDimensions.h + margin.top + margin.bottom)
		chart = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		chart.append('g').attr('class','lines')
		chart.append('g').attr('class','dots')

	}
	function show() {
		div.style('display', null)
		var curMetro = mlabOpenInternet.controls.getSelectedMetro()
		var view = 'daily'
		mlabOpenInternet.dataLoader.requestMetroData(curMetro, view, dataLoaded)
		
	}
	function dataLoaded(allMetroData) {
		console.log('all metro data loaded')
		console.log(allMetroData)
		var dataInTimePeriod = []
		var curDate = mlabOpenInternet.timeControl.getSelectedDate()
		var dateToMatch = {
			month: curDate.date.month() + 1,
			year: curDate.date.year()
		}
		//console.log(dateToMatch)

		_.each(allMetroData, function(dataset) {
			var timelyData = _.filter(dataset.data, function(d) {
				return d.month == dateToMatch.month && d.year == dateToMatch.year
			})
			//console.log(timelyData)
			dataInTimePeriod.push({data: timelyData, id: dataset.filenameID, color: dataset.color})
		})
		plot(dataInTimePeriod)
	}
	function plot(datasets) {
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		curMetric = metric;
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
				
				if(minDate === null || datum.date < minDate) {
					minDate = datum.date
				}
				if(maxDate === null || datum.date > maxDate) {
					maxDate = datum.date
				}
				var sampleSize = +datum[metricKey + "_n"]
				/*
				if(sampleSize < mlabOpenInternet.dataLoader.getMinSampleSize()) {
					return
				}
				*/
				var metricValue = +datum[metricKey]
				if(metricValue < minDataValue) {
					minDataValue = metricValue
				}
				if(metricValue > maxDataValue) {
					maxDataValue = metricValue
				}
			})
		})
		console.log(minDataValue + ' ' + maxDataValue)
		console.log(minDate + " " + maxDate)
		yScale = d3.scale.linear().domain([0, maxDataValue])
			.range([exploreDimensions.h, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		xScale = d3.time.scale().domain([minDate, maxDate]).range([0, exploreDimensions.w])
		var paths = svg.select('g.lines').selectAll('path.full').data(datasets)
		var lineGen = d3.svg.line()
			.x(function(d,i) {
				return xScale(d.date)
			})
			.y(function(d,i) {
				var yVal = yScale(d[metricKey])
				return yScale(d[metricKey])
			}).defined(function(d,i) {
				return d[metricKey+"_n"] >= mlabOpenInternet.dataLoader.getMinSampleSize()
			})
		var dotData = []
		paths.enter().append('path');
		paths.exit().remove()
		paths.attr('class','full').attr('d', function(d) {
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
		var pathsDashed = svg.select('g.lines').selectAll('path.dashed').data(datasets)
		var lineGen = d3.svg.line()
			.x(function(d,i) {
				return xScale(d.date)
			})
			.y(function(d,i) {
				return yScale(d[metricKey])
			})
		pathsDashed.enter().append('path');
		pathsDashed.exit().remove()
		pathsDashed.attr('class','dashed').attr('d', function(d) {
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
				return d.color;
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

		console.log(dotData)
		var dotSize = 5;
		var dots = svg.select('g.dots').selectAll('g.dot').data(dotData)
		dots.enter().append('g').attr('class','dot')
		dots.attr('transform', function(d) {
				var x = xScale(d.date);
				var y = yScale(d[metricKey])
				return 'translate(' + x + ',' + y + ')'
			})
		dots.exit().remove();
		var hitDot = dots.selectAll('.hitDot').data(function(d) { return [d] })
		hitDot.enter().append('circle').attr('class','hitDot')
			.attr('r', 13)
			.attr('opacity',0)
		hitDot.on('mouseover', mouseOverDot)
			.on('mouseout', mouseOutDot)
		var fillDot = dots.selectAll('.fillDot').data(function(d) { return [d] })
		fillDot.enter().append('circle').attr('class','fillDot')
			.attr('r', dotSize)
		fillDot.style('fill', function(d) { return d.color })
			.style('opacity',0)



		chart.selectAll('.axis').remove()
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom')
			.tickFormat(d3.time.format("%e %b"))
		chart.append('g').attr('class','xAxis axis').attr('transform', 'translate(0,' + exploreDimensions.h +')')
			.call(xAxis)
		var yAxis = d3.svg.axis().scale(yScale).orient('left')
			.tickFormat(function(d) {
				return d + ' ' + metric.units
			}).ticks(5)
		chart.append('g').attr('class','yAxis axis').call(yAxis)
		var numTextItems = chart.select('.yAxis').selectAll('text')[0].length
		console.log(numTextItems)
		chart.select('.yAxis').selectAll('text').attr('x', -margin.left).style('text-anchor','initial')
			.text(function(d,i) {
				var curText = d3.select(this).text();
				if(i === numTextItems - 1) {
					return curText
				}
				var textParts = curText.split(' ')
				return textParts[0]
			})
	}
	function hide() {
		div.style('display','none')
	}
	function createTT() {
		exploreTT.style('opacity',0).style('display','none')
		var content = exploreTT.append('div').attr('class','exploreTTContent')
		var arrow = exploreTT.append('div').attr('class','exploreTTArrow')
		content.append('div').attr('class','ttTitle')
		content.append('div').attr('class','ttLabel valueLabel')
		content.append('div').attr('class','ttValue valueValue')
		content.append('div').attr('class','ttLabel sampleSizeLabel').text('Sample Size')
		content.append('div').attr('class','ttValue sampleSizeValue')
		content.append('div').attr('class','ttLabel dateLabel').text('Date')
		content.append('div').attr('class','ttValue dateValue')

	}
	function mouseOverDot(d,i) {
		//console.log(d)

		var dot = d3.select(this.parentNode).select('.fillDot')
		dot.style('opacity',1)
		exploreTT.style('opacity',1).style('display','block')
		var idParts = d.dataID.split('_')
		var code = idParts[0];
		var isp = idParts[1]
		var ispNameMap = mlabOpenInternet.dataLoader.getISPNameMap();
		if(typeof ispNameMap[isp] !== 'undefined') {
			isp = ispNameMap[isp]
		}
		var tp = mlabOpenInternet.dataLoader.getTPForCode(code)
		exploreTT.select('.ttTitle').text(isp + ", " + tp)
		exploreTT.select('.valueLabel').text(curMetric.name)
		exploreTT.select('.valueValue').text(d[curMetric.key] + " " + curMetric.units)
		exploreTT.select('.sampleSizeValue').text(d[curMetric.key + '_n'])
		var momentDate = moment(d.date)
		exploreTT.select('.dateValue').text(momentDate.format('M/D/YYYY'))
		//console.log(d.date)
		var graphXPos = Math.round(xScale(d.date))
		//console.log(graphXPos)
		var x = graphXPos + margin.left;
		var y = yScale(d[curMetric.key]) + margin.top
		var lPadding = 65;
		x += lPadding

		var $tt = $(exploreTT[0][0])
		var ttWidth = $tt.width()
		if(graphXPos > exploreDimensions.w  / 2) {
			exploreTT.select('.exploreTTArrow').style('right', '15px').style('left', null)
			x -= ttWidth
			x += 15 + 8; 
		} else {
			exploreTT.select('.exploreTTArrow').style('left', '15px').style('right', null)
			x -= 15 + 7
		}

		var ttHeight = $tt.height();
		var ttPadding = 18; 
		y -= ttHeight + ttPadding


		exploreTT.style('left', x + 'px').style('top', y + 'px')
		
	}
	function mouseOutDot(d,i) {
		var dot = d3.select(this.parentNode).select('.fillDot')
		dot.style('opacity',0)
		exploreTT.style('opacity',0).style('display','none')

	}

	if( ! window.mlabOpenInternet) {
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.exploreViz = {
		init: init,
		show: show,
		hide: hide
    }
})()
