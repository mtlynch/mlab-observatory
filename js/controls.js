(function() {
	var exports = new EventEmitter()
	var div;

	var tabData = ['Explore','Compare', 'How this works']
	var metrics;
	var cities;

	var selectedMetric;
	var selectedCity;
	var selectedCombinations;

	var currentCombinationOptions;

	var metricsSelectD3;
	var $metricsSelect;

	var citySelectD3;
	var $citySelect;

	var comboSelectD3;
	var $comboSelect;

	var selectionLabels;

	function init() {
		div = d3.select('#controls')

		metrics = mlabOpenInternet.dataLoader.getMetrics()
		cities = mlabOpenInternet.dataLoader.getCities()

		selectedMetric = _.find(metrics, function(d) { return d.key === 'download_throughput'})
		selectedCity = "New York, NY"
		selectedCombinations = []

		console.log(selectedMetric)

		var tabContainer = div.append('ul').attr('class','tabs cf')
		var tabs = tabContainer.selectAll('li').data(tabData)
		tabs.enter().append('li').text(String)
			.classed('active', function(d,i) {
				return i === 0
			})

		var selectBar = div.append('div').attr('class','selectBar')

		selectionLabels = div.append('div').attr('class','selectionLabels')


		var metricsSelect = selectBar.append('select').attr('title','Metric')
		metricsSelectD3 = metricsSelect
		var metricOpts = metricsSelect.selectAll('option').data(metrics)
		metricOpts.enter().append('option').text(function(d) { return d.name })
			.attr('value', function(d) { return d.key })
		$metricsSelect = $(metricsSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeMetric)

		var citySelect = selectBar.append('select').attr('title', 'City')
		citySelectD3 = citySelect;
		var cityOpts = citySelect.selectAll('option').data(cities)
		cityOpts.enter().append('option').text(String).attr('value', String)
		$citySelect = $(citySelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCity)

		var comboSelect = selectBar.append('select')
			.attr('multiple','multiple').attr('title','Combinations')
			.attr('data-max-options', 3)
		comboSelectD3 = comboSelect
		$comboSelect = $(comboSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCombinations)
		setupComboSelectOptions()

		populateSelectionLabel()

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
	function changeCity(event) {
		var newCity = $citySelect.val();
		if(newCity === selectedCity) {
			return;
		}
		selectedCity = newCity;
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
		var options = mlabOpenInternet.dataLoader.getCombinations(selectedCity);
		currentCombinationOptions = options
		var comboOpts = comboSelectD3.selectAll('option').data(options)
		comboOpts.enter().append('option')
		comboOpts.exit().remove()
		comboOpts.text(function(d) {
			return d.label;
		})
		$comboSelect.selectpicker('val','');
		$comboSelect.selectpicker('refresh')
		selectedCombinations = []
	}

	function populateSelectionLabel() {
		var labelHTML = "";
		labelHTML += '<span class="b">' + selectedMetric.name + '</span>'
		labelHTML += ' for '
		if(selectedCombinations.length === 0) {
			labelHTML += '<span class="b">All ISPs</span> on <span class="b">All TPs</span>'
		} else {
			labelHTML += 'some subset of combinations'
		}
		labelHTML += ' in '
		labelHTML += '<span class="b">' + selectedCity + '</span>'
		selectionLabels.html(labelHTML)
	}

	exports.init = init
	exports.getSelectedCity = function() { return selectedCity }
	exports.getSelectedMetric = function() { return selectedMetric }
	exports.getSelectedCombinations = function() { return selectedCombinations }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.controls = exports;
	
})()