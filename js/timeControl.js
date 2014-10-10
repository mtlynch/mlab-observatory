(function() {
	var exports = new EventEmitter()
	var div;

	var startDate = moment(new Date(2012, 0, 1));
	var endDate = moment(new Date(2014, 7, 1))

	var selectedDate;
	var dateOptions;
	function init() {
		div = d3.select('#timeControl')

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
	exports.getSelectedDate = function() { return selectedDate }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.timeControl = exports;
	
})()