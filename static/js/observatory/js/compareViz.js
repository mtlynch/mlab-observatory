/*
viz file for the comapre visualizations
*/
(function() {
	var margin = {top: 10, right: 5, bottom: 0, left: 5}
	var dimensions = {
		w: 824 - margin.left - margin.right,
	}
	
	var graphAreaHeight = 150;
	var graphHeight = 60
	var topPadding = 20;

	var svg;
	var chart;
	var div;
	var curMetric;
	var curViewType;
	var focusLine;
	var xScale;
	var yScale;
	var curFocusDay = null;
	var tooltipContainer; 
	var tooltips;
	var numDays;
	var curTimeViewType;
	var lastMouseOverEvent = null

	/* initalize dom elements for compare */
	function init() {
		div = d3.select('#compareViz')
		svg = div.append('svg')
			.attr('width', dimensions.w + margin.left + margin.right)
		chart = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		focusLine = chart.append('line').attr('class','focus').attr('y1', 0)
			.attr('x1', -100).attr('x2', -100)
		chart.append('g').attr('class','datasets')
		tooltipContainer = div.append('div').attr('class','compareTooltips')

		svg.on('mouseover', mouseOverGraph)
		svg.on('mouseout', mouseOutGraph)
		svg.on('mousemove', mouseOverGraph)
	}

	/* show compare DOM elements and request data */
	function show() {
		div.style('display', null)
		curViewType = mlabOpenInternet.controls.getCompareByView()
		//console.log('show compare');
		var aggregationSelection = mlabOpenInternet.controls.getCompareAggregationSelection()
		console.log(aggregationSelection)
		curTimeViewType = mlabOpenInternet.controls.getSelectedTimeView().toLowerCase()

		mlabOpenInternet.dataLoader.requestCompareData(aggregationSelection, curViewType, curTimeViewType, dataLoaded)
		
	}

	//data received, filter out data that is not in the currently selected time period
	function dataLoaded(allCityData) {
		//console.log('all city data loaded')
		//console.log(allCityData)
		var dataInTimePeriod = []
		var curDate = mlabOpenInternet.timeControl.getSelectedDate()
		var dateToMatch = {
			month: curDate.date.month() + 1,
			year: curDate.date.year()
		}
		//console.log(dateToMatch)

		numDays = 0;
		_.each(allCityData, function(dataset) {
			var timelyData = _.filter(dataset.data, function(d) {
				return d.month == dateToMatch.month && d.year == dateToMatch.year
			})

			if(curTimeViewType === 'hourly') {
				var numMoved = 0
				_.each(timelyData, function(d) {
					if( + d.hour < 6) {
						numMoved ++;
						if(typeof d.dateShifted === 'undefined') {
							d.dateShifted = true;
							d.moment.add(24,'hours')
							d.date = d.moment.toDate()
						}
					}
				})
				//console.log(numMoved)
				for(var i = 0; i < numMoved; i++) {
					timelyData.push(timelyData.shift())
				}
				dataset.dateShifted = true;
			}
			//console.log(timelyData)
			dataInTimePeriod.push({data: timelyData, id: dataset.filenameID, color: dataset.color})
			numDays = Math.max(numDays, timelyData.length)
		})
		//console.log(numDays)
		plot(dataInTimePeriod)
	}

	/*
	plot all the compare graphs. sets up lines, dots, scales, labels etc
	*/
	function plot(datasets) {
		var fullHeight = datasets.length * graphAreaHeight
		//console.log(fullHeight)
		svg.attr('height', fullHeight)
		focusLine.attr('y2', fullHeight - (graphAreaHeight - graphHeight))
			.attr('x1', -100).attr('x2', -100)
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		curMetric = metric;

		/* Calculate min & max */
		var metricKey = metric.key;
		var minDataValue = Number.MAX_VALUE;
		var maxDataValue = -Number.MIN_VALUE;
		var maxDatasetLength = 0;
		var minDate = null;
		var maxDate = null;
		//console.log(datasets)
		_.each(datasets, function(dataset) {
			_.each(dataset.data, function(datum) {
				if(minDate === null || datum.date < minDate) {
					minDate = datum.date
				}
				if(maxDate === null || datum.date > maxDate) {
					maxDate = datum.date
				}
				/*
				var sampleSize = +datum[metricKey + "_n"]
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
		//console.log(minDataValue + " " + maxDataValue)
		//console.log(minDate + " " + maxDate)
		/* setup scales */
		yScale = d3.scale.linear().domain([0, maxDataValue])
			.range([graphHeight, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		xScale = d3.time.scale().domain([minDate, maxDate]).range([0, dimensions.w])
		/*setup group for each graph */
		var datasetGroups = chart.select('g.datasets').selectAll('g.dataset').data(datasets)
		datasetGroups.enter().append('g').attr('class','dataset')
		datasetGroups.exit().remove()
		datasetGroups.attr("transform",function(d,i) {
			var y = i * graphAreaHeight + (topPadding)
			var x = 0
			return 'translate(' + x + ',' + y + ')'
		})
		/* add in the full stroked path */
		var paths = datasetGroups.selectAll('path.full').data(function(d) { return [d] })
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
		paths.enter().append('path').attr('class','full');
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
			return '2px'
		}).style('stroke', function(d) {
			return d.color
		})


		var areaGen = d3.svg.area()
			.x(function(d,i) {
				return xScale(d.date)
			})
			.y(function(d,i) {
				return yScale(d[metricKey])
			})
			.y0(graphHeight)
			//.defined(function(d) { return d[metricKey + "_n"] >= mlabOpenInternet.dataLoader.getMinSampleSize()

		var areaFill = datasetGroups.selectAll('path.fill')
			.data(curTimeViewType === "hourly" ? function(d) { return [d] } : [])
		areaFill.enter().append('path')
		areaFill.exit().remove();
		areaFill.attr('class',function(d,i) {
			return 'fill fill-'+ d.id
		}).attr('d', function(d) {
			return areaGen(d.data)
		}).style('fill', function(d,i) {
			return d.color
		}).style('stroke','none')
		.style('opacity', 0.25)

		/* add in the dashed line */
		var pathsDashed = datasetGroups.selectAll('path.dashed').data(function(d) { return [d] })
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
			}).defined(function(d) {
				return d[metricKey+"_n"] > 0
			})
		pathsDashed.enter().append('path').attr('class','dashed');
		pathsDashed.exit().remove()
		pathsDashed.attr('d', function(d) {
			return lineGen(d.data) 
		}).style('stroke', function(d,i) {
			return d.color

		}).style('stroke-width', function(d) {
			if(d.active) {
				return '3px'
			} else {
				return null
			}
		})

		var dotGroup = datasetGroups.selectAll('g.dots').data(function(d) { return [d] })
		dotGroup.enter().append('g').attr('class','dots')
		dotGroup.exit().remove()
		var dotSize = 5;
		var dots = dotGroup.selectAll('circle.dot').data(function(d) {
			var dotData = d.data;
			_.each(dotData, function(dot) {
				dot.dataset = d;
			})
			return dotData
		})
		dots.enter().append('circle').attr('class','dot')
		dots.attr('transform', function(d) {
				var x = xScale(d.date);
				var y = yScale(d[metricKey])
				return 'translate(' + x + ',' + y + ')'
			})
			.attr('r', dotSize)
			.style('fill',function(d) {
				return d.dataset.color
			})
			.style('opacity', dotOpacityFunction)
		dots.exit().remove();

		tooltips = tooltipContainer.selectAll('div.compareTooltip').data(datasets)
		tooltips.enter().append('div').attr('class','compareTooltip')
		tooltips.exit().remove()
		var arrayIdent = function(d) { return [d] }
		tooltips.selectAll('div.leftArrow').data(arrayIdent)
			.enter().append('div').attr('class','leftArrow arrow')
		content = tooltips.selectAll('div.content').data(arrayIdent)
		content.enter().append('div').attr('class','content')
		tooltips.style('display','none')
		tooltips.on('mouseover',mouseOverTT)
		tooltips.selectAll('div.rightArrow').data(arrayIdent)
			.enter().append('div').attr('class','rightArrow arrow')
		var ttContent = [
			'ttLabel ttMetricLabel',
			'ttValue ttMetric',
			'ttLabel ttSampleSizeLabel',
			'ttValue ttSampleSize',
			'ttLabel ttDate'
		]
		content.selectAll('div').data(ttContent)
			.enter().append('div').attr('class',String)
			.text(function(d,i) {
				if(d === 'ttLabel ttSampleSizeLabel') {
					return 'Sample Size'
				}
			})
		/* y ticks */
		var lineTickArray = [0, 0.5, 1]
		var lineTicks = datasetGroups.selectAll('line.yScaleGuide').data(lineTickArray)
		lineTicks.enter().append('line').attr('class','yScaleGuide')
		lineTicks.attr('x1', 0).attr('x2', dimensions.w)
			.attr('y1', function(d) {
				return yScale(d * maxDataValue)
			}).attr('y2', function(d) {
				return yScale(d * maxDataValue)
			}).classed('faint', function(d,i) {
				return i !== 0
			})

		/* xaxis */
		chart.selectAll('.axis').remove()
		var format;
		var numTicks;
		if(curTimeViewType === 'daily') {
			format = '%e %b'
			numTicks = 6
		} else if(curTimeViewType === 'hourly') {
			format = '%I %p'
			numTicks = 10;
		}
		var xAxis = d3.svg.axis().scale(xScale).orient('bottom')
			.tickFormat(d3.time.format(format)).ticks(numTicks)
			.outerTickSize(0);
		datasetGroups.append('g').attr('class','xAxis axis').attr('transform', 'translate(0,' + graphHeight +')')
			.call(xAxis)

		chart.selectAll('.xAxis .tick')
			.each(function(d,i) {
				var tick = d3.select(this)
				var trans = tick.attr("transform")
				trans = trans.substr(10, trans.length - 11)
				var parts = trans.split(',')
				var xPos = parts[0]
				if(xPos > 800) {
					tick.select('text').style('text-anchor','end')
				} else if (xPos < 20) {
					tick.select('text').style('text-anchor','start')
				} else {
					tick.select('text').style('text-anchor','middle')
				}
			})
		if(curTimeViewType === 'hourly') {
			chart.selectAll('.xAxis').selectAll('text')
				.text(function(d,i) {
					var curText = d3.select(this).text();
					if(curText[0] === '0') {
						return curText.substr(1)
					}
					return curText
				})
		}
		/* yscale text label */
		var textSize;
		var maxYScale = datasetGroups.selectAll('text.yScaleMax').data([maxDataValue])
		maxYScale.enter().append('text').attr('class','yScaleMax')
		maxYScale.text(function(d) {
			return d + " " + metric.units
		}).attr('x', dimensions.w).attr('y', yScale(maxDataValue) - 6)
		.each(function(d) {
			textSize = this.getBBox()
		})
		var maxYScaleBG = datasetGroups.selectAll('rect.yScaleMaxBG').data([maxDataValue])
		maxYScaleBG.enter().append('rect').attr('class','yScaleMaxBG')
		maxYScaleBG.attr('y', textSize.y).attr('x', textSize.x)
			.attr('width', textSize.width).attr('height', textSize.height)
			.style('fill','white')
		maxYScale.moveToFront()
		var metroRegionMap = mlabOpenInternet.dataLoader.getMetroRegionToCodeMap()
		/* graph title */
		var graphLabel = datasetGroups.selectAll('text.graphLabel').data(function(d) { return [d] })
		graphLabel.enter().append('text').attr('class','graphLabel')
		graphLabel.text(function(d) {
			var idParts = d.id.split('_')
			if(curViewType === 'Metro Region') {
				var isp = idParts[1];
				var ispNameMap = mlabOpenInternet.dataLoader.getISPNameMap();
				if(typeof ispNameMap[isp] !== 'undefined') {
					isp = ispNameMap[isp]
				}
				return isp
			} else if(curViewType === 'ISP') {
				var code = idParts[0].toLowerCase();
				var metroName = code;
				_.each(metroRegionMap, function(value, key) {
					if(value === code) {
						metroName = key
					}
				})

				return metroName
			}
		}).attr('x', 0).attr('y', -15)

		dotGroup.moveToFront()

		mlabOpenInternet.controls.updateHash()

	}

	/*
	hides the compare viz dom elements
	*/
	function hide() {
		div.style('display','none')
	}

	/*
	compare viz mouse handler to create tooltip
	*/
	function mouseOverGraph(event) {
		var e;
		if(typeof event === 'undefined') {
			e = d3.event
		} else {
			e = event
		}
		lastMouseOverEvent = e;
		var x = (e.offsetX || e.clientX - $(e.target).offset().left);
		var y = (e.offsetY || e.clientY - $(e.target).offset().top);

		//console.log(d3.event)
		var off = $(div[0][0]).offset();
		y -= margin.top
		var xPos, xIndex, momentNearest, nextFocusDate;
		if(curTimeViewType === 'daily') {
			var mouseDate = xScale.invert(x)
			var day = mouseDate.getDate() + (mouseDate.getHours() >= 12 ? 1 : 0)
			var nearestDay = new Date(mouseDate.getFullYear(), mouseDate.getMonth(), day)
			//console.log(x)
			//console.log(mouseDate);
			nextFocusDate = day
			//console.log(nearestDay)
			momentNearest = moment(nearestDay)
			xPos = xScale(nearestDay)
			xIndex = ~~ (( xPos / dimensions.w ) * numDays)
			if(xIndex === numDays) {
				xIndex --
			}
			
		} else if(curTimeViewType === 'hourly') {
			var mouseHour = xScale.invert(x)
			//console.log(mouseHour)
			var hour = mouseHour.getHours() + (mouseHour.getMinutes() >= 30 ? 1 : 0)
			nextFocusDate = hour
			var nearestHour = new Date(mouseHour.getFullYear(), mouseHour.getMonth(), mouseHour.getDate(), hour)
			xPos = xScale(nearestHour)
			xIndex = ~~ (( xPos / dimensions.w ) * numDays)
			momentNearest = moment(nearestHour)
			if(xIndex === numDays) {
				xIndex --
			}
		}
		//console.log(xIndex)
		if(curFocusDay === null || curFocusDay !== nextFocusDate) {
			focusLine.transition().duration(450).ease('cubic-out')
				.attr('x1', xPos).attr('x2', xPos)
			curFocusDay = nextFocusDate
		}
		

		//console.log(xPos + " " + xIndex)
		var yIndex = ~~(y / graphAreaHeight)
		//console.log(y + " " + yIndex)
		var tooltipsOnLeft = xPos > dimensions.w / 2;
		tooltips.select('.ttMetric').text(function(d,i) {
			var dataValue = d.data[xIndex][curMetric.key];
			var valueTruncated = parseFloat(dataValue).toFixed(curMetric.decimal_digits)
			var y = i * graphAreaHeight

			d.tooltipX = xPos;
			d.tooltipY = y + margin.top + yScale(dataValue);

			return valueTruncated + ' ' + curMetric.units
		})
		tooltips.select('.ttMetricLabel').text(function(d) {
			return curMetric.name
		})
		tooltips.select('.ttSampleSize').text(function(d,i) {
			var sampleSize = d.data[xIndex][curMetric.key + "_n"]
			return sampleSize
		})
		var dateFormat;
		if(curTimeViewType === 'daily') {
			dateFormat = 'MMM D, YYYY'
		} else if(curTimeViewType === 'hourly') {
			dateFormat = 'h A<br />MMM YYYY'
		}
		tooltips.select('.ttDate').html(momentNearest.format(dateFormat))
		var activeWidthCutoffPct = 0.2;
		tooltips.style('display','block').classed('onLeft', function(d,i) {
			if(tooltipsOnLeft) {
				if(i === yIndex && d.tooltipX < dimensions.w * (1 - activeWidthCutoffPct)) {
					return false;
				}
				return true;
			} else {
				if(i === yIndex && d.tooltipX > (dimensions.w * activeWidthCutoffPct)) {
					return true;
				}
				return false;
			}
		}).classed('active', function(d,i) {
			return i === yIndex
		}).transition().duration(450).ease('cubic-out').style('left', function(d,i) {
			var x = d.tooltipX
			var arrowOffset = 8
			var thisTTOnLeft = tooltipsOnLeft;
			if(i === yIndex  && (
				d.tooltipX < dimensions.w * (1 - activeWidthCutoffPct)
				&&
				d.tooltipX > (dimensions.w * activeWidthCutoffPct) 
				)
			) {
				thisTTOnLeft = !thisTTOnLeft
			}
			if(thisTTOnLeft) {
				x -= $(this).width() + arrowOffset
			} else {
				x += arrowOffset + 10
			}
			return x + 'px'
		}).style('top', function(d) {
			var ttHeight = $(this).outerHeight();
			var y = d.tooltipY
			y -= ttHeight / 2
			y += topPadding
			return y + 'px'
		})
		if(curTimeViewType === 'daily') {
			chart.selectAll('circle.dot').style('opacity',0)

			chart.selectAll('g.dataset')
				.selectAll('circle.dot:nth-child(' + (xIndex + 1) + ')')
				.style('opacity',1)
		}

	}

	/*
	hides tooltip
	*/
	function mouseOutGraph() {
		tooltips.style('display','none')
		focusLine.transition().duration(0).attr('x1', -100).attr('x2', -100)
		if(curTimeViewType === 'daily') {
			chart.selectAll('circle.dot').style('opacity',0)
		}
		
	}

	/* helper function to ensure tooltip doesn't hide when you mouse over it
	*/
	function mouseOverTT() {
		mouseOverGraph(lastMouseOverEvent)
	}

	/* helper function to define dot opacity */
	function dotOpacityFunction(d,i) {
		if(curTimeViewType === 'daily') {
			return 0;
		} else if(curTimeViewType === 'hourly') {
			return 1
		}
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
