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
		selectedDateLabels = div.append('div').attr('class','selectedDateLabels')

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
		
		_.defer(function() {
			exports.emitEvent('switchTab', [selectedTab])

		})

	}
	function clickTab(d,i) {
		var dTab = d3.select(this);
		if(dTab.classed('active')) {
			return
		}
		selectedTab = d
		$(div[0][0]).find('.tabs li.active').removeClass('active')
		dTab.classed('active', true)
		console.log(d)
		if(d.id === 'explore') {
			showExploreControls();
		} else if(d.id === 'compare') {
			showCompareControls();
		} else if(d.id === 'help') {
			showHelpControls()
		}
		populateSelectionLabel()
		exports.emitEvent('switchTab', [d])
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
		comboOpts.text(function(d) {
			return d.label;
		})
		$comboSelect.selectpicker('val','');
		$comboSelect.selectpicker('refresh')
		$comboSelect.next().width(168)
		selectedCombinations = []
	}

	function populateSelectionLabel() {
		var labelHTML = "";
		labelHTML += '<span class="b">' + selectedMetric.name + '</span>'
		labelHTML += ' for '
		var colors = mlabOpenInternet.dataLoader.getColors()
		if(selectedTab.id === 'explore') {
			if(selectedCombinations.length === 0) {
				labelHTML += '<span class="b">All ISPs</span> on <span class="b">All TPs</span> '
			} else {
				var byISP = {}
				var byTP = {}
				_.each(selectedCombinations, function(combo) {
					console.log(combo.filename)
					var idParts = combo.filename.split('_')
					var mlabID = idParts[0]
					var tp = mlabOpenInternet.dataLoader.getTPForCode(mlabID)
					var isp = idParts[1]
					if(typeof byISP[isp] === 'undefined') {
						byISP[isp] = []
					}
					if(typeof byTP[tp] === 'undefined') {
						byTP[tp] = []
					}
					console.log(tp)
					byISP[isp].push(tp)
					byTP[tp].push(isp)
				})
				var numISPs = Object.keys(byISP).length
				var numTPs = Object.keys(byTP).length
				var ispIndex = 0;
				var tpIndex = 0;
				_.each(byTP, function(isps, tp) {
					_.each(isps, function(isp, ispIndex) {
						var color = colors[isp][0]
						var ispLabel = isp
						var ispNameMap = mlabOpenInternet.dataLoader.getISPNameMap();
						if(typeof ispNameMap[ispLabel] !== 'undefined') {
							ispLabel = ispNameMap[ispLabel]
						}
						labelHTML += '<span class="b" style="color: #' + color + '";>' + ispLabel + '</span>'
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
		} else if(selectedTab.id === 'compare') {
			var color = null;
			if(selectedCompareViewBy === 'ISP') {
				color = colors[selectedISP][0]
			}
			labelHTML += '<span class="b"' + (color !== null ? ' style="color:#' + color + '"' : '') + '>'
			if(selectedCompareViewBy === 'Metro Region') {
				labelHTML += selectedMetroRegion
			} else if(selectedCompareViewBy === 'ISP') {
				var ispMap = mlabOpenInternet.dataLoader.getISPNameMap();
				var isp = selectedISP
				if(typeof ispMap[isp] !== 'undefined') {
					isp = ispMap[isp]
				}
				labelHTML += isp
			}
			labelHTML += '</span>'
		}
		selectionLabels.html(labelHTML)
	}
	function showExploreControls() {
		$compareViewBySelect.next().hide() //kind of odd 
		$comboSelect.next().show()
		$metroSelect.next().show();
		$metricsSelect.next().show();
		$ispSelect.next().hide()
		console.log($compareViewBySelect)
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
	exports.init = init
	exports.getSelectedMetro = function() { return selectedMetroRegion }
	exports.getSelectedMetric = function() { return selectedMetric }
	exports.getSelectedCombinations = function() { return selectedCombinations }
	exports.getCompareByView = function() { return selectedCompareViewBy }
	exports.getSelectedTab = function() { return selectedTab }
	exports.getCompareAggregationSelection = getCompareAggregationSelection
	exports.getHelpTab = function() { return selectedHelpTab }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.controls = exports;
	
})()