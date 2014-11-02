(function() {
	var exports = new EventEmitter()
	var div;
	var arrowURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAJCAYAAADkZNYtAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAALdJREFUeNpi7OnpYQACSSB+CcT/GLADAyD+ygQkEoD4KRCvBWIWLAqjgfgcEJ8GKZYAYkYgDgDiRUDMjKTQCYjnQeWfghT3AfEWqGQkEM+ESmoC8TogZgPij0AcCrL2FxCHQDW4AHEy1O2OQMwPlQ8C4mtMUBN/ArE/EB+B8lOBWAWI/wNxEhDvAwkyIbnvGxD7gDyCJNYIxEthHHTfg9zmBTXpEhA3IUtiC6o30FD4BHUGHAAEGADvDSRjAuRkzAAAAABJRU5ErkJggg=='
	var tabData = [
		{lbl: 'Explore', id: 'explore'},
		{lbl: 'Compare', id: 'compare'},
		{lbl: 'How this works', id: 'help'} 
	]
	var helpTabs = [
		'Our Tool', 'The Internet'
	]
	var metrics;
	var metros;

	var selectedMetric;
	var selectedMetroRegion;
	var selectedCombinations;
	var selectedISP;
	var selectedCompareViewBy;

	var selectedTab;

	var currentCombinationOptions;

	var metricsSelectD3;
	var $metricsSelect;

	var metroSelectD3;
	var $metroSelect;

	var ispSelectD3;
	var $ispSelect;

	var comboSelectD3;
	var $comboSelect;

	var compareViewBySelectD3;
	var $compareViewBySelect;
	var viewByOpts = ['ISP','Metro Region']

	var selectionLabels;
	var selectedDateLabels;

	var helpTabsList;
	var helpTabs;
	var selectedHelpTab = null
	var firstOptionsSet = false;
	var viewingFromDeeplink = false
	var shareText = null
	function init() {
		div = d3.select('#controls')

		metrics = mlabOpenInternet.dataLoader.getMetrics()
		metros = mlabOpenInternet.dataLoader.getMetroRegions()

		selectedMetric = _.find(metrics, function(d) { return d.key === 'download_throughput'})
		selectedMetroRegion = "New York"
		selectedCombinations = []

		console.log(selectedMetric)

		var tabContainer = div.append('ul').attr('class','tabs cf')
		var tabs = tabContainer.selectAll('li').data(tabData)
		tabs.enter().append('li').text(function(d) { return d.lbl})
			.classed('active', function(d,i) {
				return i === 0
			})
			.on('click', clickTab)
		var selectBar = div.append('div').attr('class','selectBar')

		selectionLabels = div.append('div').attr('class','selectionLabels')
		selectedDateLabels = div.append('div').attr('class','selectedDateLabels cf')
		var dateLabels = selectedDateLabels.append('div').attr('class','dateLabels')
		var socialIcons = selectedDateLabels.append('div').attr('class','socialIcons cf')
		socialIcons.append('div').attr('class','shareLabel').text("Share:")
		var icons = [
			'google','fb','twitter'
		]
		socialIcons.selectAll('div.socialIcon').data(icons).enter().append('div').attr('class',function(d) {
			return 'socialIcon socialIcon-' + d
		}).on('click', clickSocialIcon)

		var metricsSelect = selectBar.append('select').attr('title','Metric')
		metricsSelectD3 = metricsSelect
		var metricOpts = metricsSelect.selectAll('option').data(metrics)
		metricOpts.enter().append('option').text(function(d) { return d.name })
			.attr('value', function(d) { return d.key })
			.attr('selected',function(d,i) {
				if(d.name === selectedMetric.name) {
					return 'selected'
				}
				return null
			})
		$metricsSelect = $(metricsSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeMetric)
		$metricsSelect.next().width(95)

		compareViewBySelectD3 = selectBar.append('select').attr('title', 'View By')
		var viewByOptions = compareViewBySelectD3.selectAll('option').data(viewByOpts)
		viewByOptions.enter().append('option').text(String).attr('value', String)
			.attr('selected', function(d) {
				if(d === 'Metro Region') {
					return 'selected'
				}
				return null
			})
		$compareViewBySelect = $(compareViewBySelectD3[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCompareViewBy)
		$compareViewBySelect.next().width(107)

		var metroSelect = selectBar.append('select').attr('title', 'Metro Region')
		metroSelectD3 = metroSelect;
		var metroOpts = metroSelect.selectAll('option').data(metros)
		metroOpts.enter().append('option').text(String).attr('value', String)
			.attr('selected', function(d) {
				if(d === selectedMetroRegion) {
					return 'selected'
				}
				return null
			})
		$metroSelect = $(metroSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeMetro)
		$metroSelect.next().width(140)

		ispSelectD3 = selectBar.append('select').attr('title','ISP')
		var ispOptsArray = mlabOpenInternet.dataLoader.getISPs();
		var ispOpts = ispSelectD3.selectAll('option').data(ispOptsArray)
		ispOpts.enter().append('option').text(function(d) {
			var ispMap = mlabOpenInternet.dataLoader.getISPNameMap()
			if(typeof ispMap[d] !== 'undefined') {
				return ispMap[d]
			}
			return d
		}).attr('value', String)
		$ispSelect = $(ispSelectD3[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCompareISP)
		selectedISP = ispOptsArray[0]
		$ispSelect.next().width(75)

		var comboSelect = selectBar.append('select')
			.attr('multiple','multiple').attr('title','ISP Combinations')
			.attr('data-max-options', 3)
		comboSelectD3 = comboSelect
		$comboSelect = $(comboSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCombinations)
		setupComboSelectOptions()

		div.selectAll('.caret')
			.classed('caret', false)
			.append('img')
			.attr('src', arrowURL)

		helpTabsList = selectBar.append('div').attr('class','btn-group helpTabs')
			.style('display','none')
		helpTab = helpTabsList.selectAll('button').data(helpTabs)
			.enter().append('button').attr('class','helpTab btn btn-default')
			.classed('active', function(d,i) {
				return i === 0
			})
			.on('click', clickHelpTab)
		helpTab.append('div').text(String).attr('class','text')
		helpTab.append('div').attr('class','underline')

		selectedTab = tabData[0]
		selectedHelpTab = helpTabs[0]
		populateSelectionLabel()

		showExploreControls();
		

		var hash = document.location.hash;
		
		populateFromHash(hash)

		_.defer(function() {
			exports.emitEvent('switchTab', [selectedTab])

		})

	}
	function clickSocialIcon(d) {
		var shareURL = encodeURIComponent(document.location.toString())
		var fullURL;
		var text = encodeURIComponent(shareText)
		switch(d) {
			case "twitter":
				fullURL = "https://twitter.com/share?text=" + text + " &url=" + shareURL
			break;
			case "google":
				fullURL = "https://plus.google.com/share?url=" + shareURL
			break;
			case "fb":
				fullURL = "http://www.facebook.com/sharer/sharer.php?u=" + shareURL
			break
		}
		window.open(fullURL)
	}
	function clickTab(d,i, passEvent) {
		//console.log(arguments)
		if(typeof passEvent === 'undefined') {
			passEvent = true;
		}
		if(typeof passEvent !== true && passEvent !== false) {
			passEvent = true
		}
		var dTab = d3.select(div.select('.tabs').selectAll('li')[0][i]);

		if(dTab.classed('active')) {
			return
		}
		selectedTab = d
		$(div[0][0]).find('.tabs li.active').removeClass('active')
		dTab.classed('active', true)
		//console.log(d)
		if(d.id === 'explore') {
			showExploreControls();
		} else if(d.id === 'compare') {
			showCompareControls();
		} else if(d.id === 'help') {
			showHelpControls()
		}
		populateSelectionLabel()
		if(passEvent) {
			exports.emitEvent('switchTab', [d])
		}
	}
	function changeMetric(event) {
		var newMetric = _.find(metrics, function(d) { return d.key === $metricsSelect.val() } )
		if(newMetric.key === selectedMetric.key) {
			return;
		}
		selectedMetric = newMetric
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')
	}
	function changeMetro(event) {
		var newMetro = $metroSelect.val();
		if(newMetro === selectedMetroRegion) {
			return;
		}
		selectedMetroRegion = newMetro;
		setupComboSelectOptions()
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')

	}
	function changeCombinations(event) {
		console.log('change combos')
		console.log($comboSelect.val())
		var selectVal = $comboSelect.val()
		if(selectVal === null) {
			selectVal = []
		}
		selectedCombinations = _.filter(currentCombinationOptions, function(d) {
			return selectVal.indexOf(d.label) !== -1
		})
		console.log(selectedCombinations)
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')

	}
	function setupComboSelectOptions() {
		var options = mlabOpenInternet.dataLoader.getCombinations(selectedMetroRegion);
		currentCombinationOptions = options
		var comboOpts = comboSelectD3.selectAll('option').data(options)
		comboOpts.enter().append('option')
		comboOpts.exit().remove()
		var selectedOpts = []
		comboOpts.text(function(d) {
			return d.label;
		}).each(function(d,i) {
			var opt = d3.select(this);
			if(! firstOptionsSet && (i === 0 || i === 2)) {
				opt.attr('selected', 'selected')
				selectedOpts.push(d.label)
			} else if(i === 0) {
				opt.attr('selected', 'selected')
				selectedOpts.push(d.label)
			}
		})

		firstOptionsSet = true

		$comboSelect.selectpicker('val', selectedOpts);
		$comboSelect.selectpicker('refresh')
		$comboSelect.next().width(168)
		selectedCombinations = _.filter(currentCombinationOptions, function(d) {
			return selectedOpts.indexOf(d.label) !== -1
		})
	}

	function populateSelectionLabel() {
		shareText = ""
		shareText += selectedMetric.name + " "
		var labelHTML = "";
		labelHTML += '<span class="b">' + selectedMetric.name + '</span>'
		labelHTML += ' for '
		var colors = mlabOpenInternet.dataLoader.getColors()
		if(selectedTab.id === 'explore') {
			if(selectedCombinations.length === 0) {
				labelHTML += '<span class="b">All Access ISPs</span> on <span class="b">All Transit ISPs</span> '
			} else {
				var byTP = {}
				_.each(selectedCombinations, function(combo) {
					var idParts = combo.filename.split('_')
					var mlabID = idParts[0]
					var tp = mlabOpenInternet.dataLoader.getTPForCode(mlabID)
					var isp = idParts[1]
					if(typeof byTP[tp] === 'undefined') {
						byTP[tp] = []
					}
					byTP[tp].push({isp: isp, filename: combo.filename})
				})
				var numTPs = Object.keys(byTP).length
				var tpIndex = 0;
				_.each(byTP, function(isps, tp) {
					_.each(isps, function(isp, ispIndex) {
						var ispLabel = isp.isp
						var color = mlabOpenInternet.dataLoader.getColorForFilename(isp.filename)
						var ispNameMap = mlabOpenInternet.dataLoader.getISPNameMap();
						if(typeof ispNameMap[ispLabel] !== 'undefined') {
							ispLabel = ispNameMap[ispLabel]
						}
						labelHTML += '<span data-id="' + isp.filename + '" class="ispSelectionLabel b" style="color: ' + color + '";>' + ispLabel + '</span>'
						if(isps.length > 1 && ispIndex != isps.length - 1) {
							labelHTML += ','
						}
						labelHTML += ' '
					})
					labelHTML += ' on <span class="b">' + tp + '</span>'
					if(numTPs > 1 && tpIndex !== numTPs - 1) {
						labelHTML += ','
					}
					labelHTML += ' '
					tpIndex ++

				})
			}
			labelHTML += 'in '
			labelHTML += '<span class="b">' + selectedMetroRegion + '</span>'
			shareText += "in " + selectedMetroRegion
		} else if(selectedTab.id === 'compare') {
			var color = null;
			if(selectedCompareViewBy === 'ISP') {
				color = colors[selectedISP][0]
			}
			labelHTML += '<span class="b"' + (color !== null ? ' style="color:#' + color + '"' : '') + '>'
			if(selectedCompareViewBy === 'Metro Region') {
				labelHTML += selectedMetroRegion
				shareText += "in " + selectedMetroRegion
			} else if(selectedCompareViewBy === 'ISP') {
				var ispMap = mlabOpenInternet.dataLoader.getISPNameMap();
				var isp = selectedISP
				if(typeof ispMap[isp] !== 'undefined') {
					isp = ispMap[isp]
				}
				labelHTML += isp
				shareText += "on " + isp
			}
			labelHTML += '</span>'
		}
		selectionLabels.html(labelHTML)
		selectionLabels.selectAll('.ispSelectionLabel').on('mouseover', function(d,i) {
			var d3this = d3.select(this)
			var color = d3this.style('color')
			d3this.style('border-bottom', '3px solid ' + color)
			var id = d3this.attr('data-id')
			d3.select('#exploreViz .lines').selectAll('path').transition().duration(300)
				.style('stroke-width',function(d,i) {
					if(d.id === id) {
						return 6
					} else if(d.active) {
						return 3;
					}
					return null
				})

		}).on('mouseout', function(d,i) {
			var d3this = d3.select(this)
			d3this.style('border-bottom',null)
			d3.select('#exploreViz .lines').selectAll('path').transition().duration(300)
				.style('stroke-width',function(d) {
					if(d.active) {
						return 3
					}
					return null
				})
		})

	}
	function showExploreControls() {
		$compareViewBySelect.next().hide() //kind of odd 
		$comboSelect.next().show()
		$metroSelect.next().show();
		$metricsSelect.next().show();
		$ispSelect.next().hide()
		//console.log($compareViewBySelect)
		selectionLabels.style('display','block')
		selectedDateLabels.style('display','block')
		helpTabsList.style('display','none')

	}
	function showCompareControls() {
		$compareViewBySelect.next().show()
		changeCompareViewBy()
		$comboSelect.next().hide()
		$metricsSelect.next().show();
		selectionLabels.style('display','block')
		selectedDateLabels.style('display','block')
		helpTabsList.style('display','none')

	}
	function showHelpControls() {
		div.selectAll('.selectBar > *').style('display','none')
		selectionLabels.style('display','none')
		selectedDateLabels.style('display','none')
		helpTabsList.style('display','inline-block')
	}
	function changeCompareViewBy() {
		var compareSelectType = $compareViewBySelect.val()
		selectedCompareViewBy = compareSelectType
		if(compareSelectType === 'Metro Region') {
			$metroSelect.next().show();
			$ispSelect.next().hide()
		} else if(compareSelectType === 'ISP') {
			$metroSelect.next().hide();
			$ispSelect.next().show();
		}
		populateSelectionLabel()

		exports.emitEvent('selectionChanged')

	}
	function changeCompareISP() {
		selectedISP = $ispSelect.val()
		populateSelectionLabel()

		exports.emitEvent('selectionChanged')
	}
	function getCompareAggregationSelection() {
		var viewType = $compareViewBySelect.val()
		if(viewType === 'Metro Region') {
			return $metroSelect.val();
		} else if(viewType === 'ISP') {
			return $ispSelect.val()
		}
	}
	function clickHelpTab(d) {
		helpTabsList.selectAll('.active').classed('active', false)
		d3.select(this).classed('active', true)
		selectedHelpTab = d
		exports.emitEvent('selectionChanged')
	}
	function getDeepLinkHash() {
		var hashObj = {}
		hashObj['tab'] = selectedTab.id
		if(selectedTab.id === 'explore') {
			hashObj['metric'] = selectedMetric.key
			hashObj['metro'] = selectedMetroRegion.replace(/ /g,'')
			hashObj['combos'] = _.reduce(selectedCombinations, function(out, combo,index) {
				var o = out + combo.filename
				if(index != selectedCombinations.length - 1) {
					o += ','
				}
				return o
			},'')
		

			var time = mlabOpenInternet.timeControl.getDeepLinkHash()
			if(time !== null) {
				hashObj['time'] = time
			}
			if(mlabOpenInternet.exploreViz.hidingGreyLines()) {
				hashObj['hidingGrey'] = '1'
			}

		} else if(selectedTab.id === 'compare') {
			hashObj['metric'] = selectedMetric.key
			hashObj['viewBy'] = selectedCompareViewBy.replace(/ /g, '')
			if(selectedCompareViewBy === 'Metro Region') {
				hashObj['metro'] = selectedMetroRegion.replace(/ /g,'')
			} else if(selectedCompareViewBy === 'ISP') {
				hashObj['isp'] = selectedISP
			}
			var time = mlabOpenInternet.timeControl.getDeepLinkHash()
			if(time !== null) {
				hashObj['time'] = time
			}
		}
		var hash = _.reduce(hashObj, function(hashVal, value, key) {
		//	console.log(key + " " + value)
			hashVal += key + "=" + value + "&"
			return hashVal
		},'')


		return hash
	}

	function populateFromHash(hash) {
		if(hash === '') {
			return
		}
		function getQueryParameters(str) {
			return (str || document.location.search).replace(/(^\#)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
		}

		var hashObj = getQueryParameters(hash)
		console.log(hashObj)
		if(typeof hashObj['tab'] !== 'undefined') {
			var tab = hashObj['tab'];		
			var selectedTabIndex = _.findIndex(tabData, function(d,i) {
				return d.id === tab
			})
			if(selectedTabIndex !== -1) {
				selectedTab = tabData[selectedTabIndex]
				clickTab(selectedTab, selectedTabIndex, false)
				viewingFromDeeplink = true;

			}
		}
		
		if(typeof hashObj['metric'] !== 'undefined') {
			var selectedMetricIndex = _.findIndex(metrics, function(d) {
				return d.key === hashObj['metric']
			})
			if(selectedMetricIndex !== -1) {
				selectedMetric = metrics[selectedMetricIndex]
				$metricsSelect.selectpicker('val', selectedMetric.key)
				console.log(selectedMetricIndex)
				viewingFromDeeplink = true;
			}
		}
		if(typeof hashObj['metro'] !== 'undefined') {
			var selectedMetroIndex = _.findIndex(metros, function(d) {
				return d.replace(/ /g, '') === hashObj['metro']
			})
			console.log(selectedMetroIndex)
			if(selectedMetroIndex !== -1) {
				selectedMetroRegion = metros[selectedMetroIndex]
				$metroSelect.selectpicker('val', selectedMetroRegion)
				viewingFromDeeplink = true;

			}
			console.log(selectedMetroRegion)
			setupComboSelectOptions()
		}
		if(typeof hashObj['combos'] !== 'undefined') {
			var combos = hashObj['combos'].split(',')
			console.log(combos)
			window.combo = $comboSelect
			var newCombos = [];
			_.each(combos, function(combo) {
				var validCombo = _.find(currentCombinationOptions, function(d) {
					return d.filename === combo
				})
				if(typeof validCombo !== 'undefined') {
					newCombos.push(validCombo)
				}
				viewingFromDeeplink = true;
			})
			$comboSelect.selectpicker('val', _.map(newCombos, function(d) { return d.label }))
			selectedCombinations = newCombos
		}
		if(typeof hashObj['hidingGrey'] !== 'undefined' && hashObj['hidingGrey'] === '1') {
			mlabOpenInternet.exploreViz.hidingGreyLines(true)
				viewingFromDeeplink = true;
		}

		if(typeof hashObj['time'] !== 'undefined') {
			mlabOpenInternet.timeControl.setTime(hashObj['time'])
				viewingFromDeeplink = true;
		}
		
		if(typeof hashObj['viewBy'] !== 'undefined') {
			var viewOptionIndex = _.findIndex(viewByOpts,function(d,i) {
				return d.replace(/ /g, '') === hashObj['viewBy']
			})
			if(viewOptionIndex !== -1) {
				selectedCompareViewBy = viewByOpts[viewOptionIndex]
				$compareViewBySelect.selectpicker('val', selectedCompareViewBy)
				if(selectedCompareViewBy === 'Metro Region') {
					$metroSelect.next().show();
					$ispSelect.next().hide()
				} else if(selectedCompareViewBy === 'ISP') {
					$metroSelect.next().hide();
					$ispSelect.next().show();
				}
				viewingFromDeeplink = true;
			}
		}
		if(typeof hashObj['isp'] !== 'undefined') {
			var allISPs = mlabOpenInternet.dataLoader.getISPs()
			var ispIndex = _.findIndex(allISPs, function(d,i) {
				return d === hashObj['isp']
			})
			if(ispIndex !== -1) {
				selectedISP = allISPs[ispIndex]
				$ispSelect.selectpicker('val', selectedISP)
				viewingFromDeeplink = true;
			}
		}
		populateSelectionLabel()

	}
	function updateHash() {
		var hash = getDeepLinkHash()
		console.log(hash)
		
		if(window.history) {
			window.history.replaceState(null, null, '#' + hash)
		}
	}
	exports.init = init
	exports.getSelectedMetro = function() { return selectedMetroRegion }
	exports.getSelectedMetric = function() { return selectedMetric }
	exports.getSelectedCombinations = function() { return selectedCombinations }
	exports.getCompareByView = function() { return selectedCompareViewBy }
	exports.getSelectedTab = function() { return selectedTab }
	exports.getCompareAggregationSelection = getCompareAggregationSelection
	exports.getHelpTab = function() { return selectedHelpTab }
	exports.populateSelectionLabel = populateSelectionLabel
	exports.isViewingDeeplink = function() { return viewingFromDeeplink }
	exports.updateHash = updateHash
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.controls = exports;
	
})()