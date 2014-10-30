(function() {
	var exports = new EventEmitter()
	var div;
	var $div;
	var left, right ,divider;
	var helpPopup;
	var bottomPadding = 10;
	var defaultDefHeight = 63;

	var popupDontShowCookiename = 'mlabDontShowPopup'

	var popupCopy = '<div class="popupHeader helpHeader">The Internet is a magical place</div>' +
	'<div class="helpCopy">The M-Lab Data Observatory allows a window into ISP performance, letting people in the US see how their ISP is doing compared to others, and to view the way in which the connections between ISPs impact performance.</div>' +
	'<div class="helpCopy">By selecting different options, you can compare a variety of metrics like upload or download speed, round trip time or packet retransmission rate, for different ISPs. You can also see how different ISPs performed across varying locations in the US.</div>' +
	'<ul class="buttons cf">' +
	'<li>How this works</li>' + 
	'<li>Explore the tool</li>' +
	'</ul>' +
	'<div class="dontshow"><div class="cb"></div><div class="lbl">Please don\'t show me this again</div></div>'

	var toolCopy = 
	'<div class="helpHeader">Our Tool</div>' + 
	'<div class="helpCopy">The M-Lab Data Observatory provides a way to explore ISP performance across a number of metrics, locations, and time periods. It also allows a view into the way ISPs’ connections with each other -- the interconnectedness that makes up the Internet -- shape performance. By selecting different options, you can see how various ISPs performance across a variety of metrics like <a href="#" data-word="Upload Throughput (Megabits per second, Mbps)">upload</a> or <a href="#" data-word="Download Throughput (Megabits per second, abbreviated Mbps)">download speed</a>, <a href="#" data-word="Round Trip Time (Milliseconds, ms)">round trip time</a> or <a href="#" data-word="Packet retransmission rate">packet retransmission rate</a>. You can also see how these metrics differed over time, across locations, or relative to ISP interconnection relationships.</div>' + 
	'<div class="helpHeader">Exploring the data</div>' +
	'<div class="helpCopy">Observatory is a tool for exploring M-Lab’s data by selecting a metric like download speed, and then displaying graphs of the data in combination with additional filters.</div>' + 
	'<ul>' + 
	'<li>First, select the metric you’d like to visualize</li>' + 
	'<li>Then select a city</li>' + 
	'</ul>' + 
	'<div class="helpCopy" style="margin-bottom:0;">Based on the city you select, the combinations filter options will change, listing the combinations of <a href="#" data-word="Access ISP or Access Network">Access ISP</a> and <a href="#" data-word="Transit ISP or Transit Network">Transit ISP</a> available in that city.</div>' +
	'<ul style="margin-top: 0;"><li>Select one or more of those combinations to view or compare the data you’ve selected</li></ul>' +
	'<img src="static/observatory/images/graphExample.png" />' +
	'<div class="helpCopy">Based on the selections you make and filters you applied, Observatory graphs the results, highlighting the selected Access ISP / Transit ISP combination(s). Grey lines are shown behind your selection(s) to provide a quick visual comparison to other unselected combinations. You can turn these grey lines on or off using the link at the top right of the graph.</div>' +
	'<div class="helpCopy">Hover over the lines to see how many tests are contributing to the performance data, and to see what the median value on that date is or a range over data points and dates.</div>' +
	'<img src="static/observatory/images/graphHover.png" />' +
	'<div class="helpCopy">Adjust the timeline by moving the selected area to see how the performance changes at different times of day and on different dates.</div>' +
	'<img src="static/observatory/images/timeline.png" />';

	
	var internetCopy = 
	'<div class="helpHeader internetHeader">How the Internet Works</div>' +
	'<div class="helpCopy">Whenever we use a computer, a smartphone, tablet or other connected device to go online, we’re accessing our content and services via a collection of networks owned and operated by many organizations and companies across the world. The Internet is an interconnected mesh of separate networks. From a US consumer’s perspective, we buy Internet service, and once it’s hooked up, our ISP (say Verizon, Comcast or Time Warner) lets us connect with everything on the web. To be able to provide us this vast access, our individual ISP must connect to the rest of the Internet. This happens via “<a href="#" data-word="Interconnection">interconnection</a>.” Our ISP connects to other, less well-known ISPs that we refer to as transit providers. The points at which transit providers and access ISPs meet and exchange traffic are called “interconnection.” What this means is that the performance we get to our favorite sites and services is determined by many factors, including the relationship between our access ISP and the transit ISPs that it interconnects with.</div>' +
	'<a href="static/observatory/images/internetInfographic.png" target="_blank"><img style="width: 540px;" src="static/observatory/images/internetInfographic.png" /></a>' +
	'<div class="helpCopy">M-Lab choses the locations of its measurement points carefully, placing them inside transit ISPs that interconnect with many other ISPs. This provides a representative location at which it’s possible to measure representative performance as experienced by end-users. In other words, when you run an M-Lab test, the measurement of your connection replicates the experience you have many times daily -- crossing the boundaries of networks and infrastructure owners to download a webpage, or access a file, etc.. This ability to get whatever is hosted on the Internet, from anywhere connected to the Internet, is fundamental to how the Internet functions. Without it, the Internet is not longer in inter-network, and is instead an intra-network.</div>'  +
	'<a href="static/observatory/images/mlabInfographic.png" target="_blank"><img style="width: 540px;" src="static/observatory/images/mlabInfographic.png" /></a>' +
	'<div class="helpHeader">Additional Resources</div>' +
	'<ul>' + 
	'<li>"The Internet is Serious Business"<br /><a href="http://welcometocup.org/Projects/UrbanInvestigations/TheInternetIsSeriousBusiness" target="_blank">http://welcometocup.org/Projects/UrbanInvestigations/<br />TheInternetIsSeriousBusiness</a></li>' +
	'<li>"Learn Networking Basics"<br /><a href="https://commotionwireless.net/docs/cck/networking/learn-networking-basics/" target="_blank">https://commotionwireless.net/docs/cck/networking/<br />learn-networking-basics/</a></li>' +
	'<li>"How the 	Internet Sees You: An Illustrated Guide"<br /><a href="https://www.youtube.com/watch?v=Oqd6S5av5eg" target="_blank">https://www.youtube.com/watch?v=Oqd6S5av5eg</a></li>' +

	'</ul>'
	var defData = [
		{
			'label': 'Infrastructure',
			'terms': [
				{
					'term': 'Access ISP or Access Network ',
					'def': 'An access ISP is the Internet Service Provider that you interact with the most. They connect people’s homes and charge a monthly fee for Internet service. To connect their networks and customers to the rest of the Internet, they either directly interconnect with transit ISPs or pay one or more transit ISPs to carry their traffic.'
				},
				{
					'term': 'Transit ISP or Transit Network',
					'def': 'A transit ISP is a kind of “meta-ISP”, which provides long-distance carrying of packets, usually to other ISPs instead of to consumers directly. Transit ISPs are the organizations which lay undersea cables and dig trenches across mountain ranges, and then charge ISPs to carry traffic through those links. Transit ISPs are similar to the long distance shipping companies that move big containers -- they aren’t the company that brings the Internet into your house, but they do the transportation between cities, regions, countries, and across the ocean. Sometimes transit ISPs are also called “Tier 1 ISPs”, because those top-tier ISPs can usually get traffic to anywhere in the world.'
				},
				{
					'term': 'Measurement Point ',
					'def': 'An M-Lab node, consisting of three specially configured servers connected to a Transit ISP. When you run an M-Lab test, your computer connects to the closest M-Lab measurement point, which coordinates the test you’re running and collects the data for that test.'
				},
				{
					'term': 'Interconnection',
					'def': 'An interconnection is where different ISPs connect their respective networks to one another. All of these interconnection taken together make it possible to access content anywhere on the Internet. Many interconnections are private, where only two ISPs meet, while others are shared Inter-eXchange Points (IXPs) where many ISPs connect to each other.'
				},
				{
					'term': 'Inter-eXchange Points (IXPs)',
					'def': 'The physical locations where ISPs exchange Internet traffic (interconnect) between their networks.'
				},
			]
		},
		{
			'label': 'Tools',
			'terms': [
				{
					'term': 'Network Diagnostic Tool (NDT)',
					'def': 'A sophisticated speed and diagnostic test suitable for both the novice and the network researcher, NDT reports upload and download speeds, attempts to determine what problems limited those speeds, and provides detailed diagnostic reporting on what it found.'
				}
			]
		},
		{
			'label': 'Metrics',
			'terms': [
				{
					'term': 'Download Throughput (Megabits per second, abbreviated Mbps)',
					'def': 'How much data can be downloaded (server to user computer) per unit of time.   Note that networking capacity is generally measured in bits per second, while application file sizes are generally measured in bytes, which are 8 bit each.  So for example downloading a 1 megabyte photo image in 10 seconds would be 8 Megabits per second or 8 Mbps.'
				},
				{
					'term': 'Upload Throughput (Megabits per second, Mbps)',
					'def': 'How much data can be uploaded (user computer to Internet server) per unit time'
				},
				{
					'term': 'Round Trip Time (Milliseconds, ms)',
					'def': 'How much data can be downloaded (server to user computer) per unit of time.   Note that networking capacity is generally measured in bits per second, while application file sizes are generally measured in bytes, which are 8 bit each.  So for example downloading a 1 megabyte photo image in 10 seconds would be 8 Megabits per second or 8 Mbps. ' +
					'How much time does it take for a packet to go from point A to point B and back. The shorter the time, the better. ' +
					'Minimum: the minimum latency measured in transmissions from the server to the client, reported in milliseconds. Normally, this is a good indication of physical path distance, except when there is high load. ISPs with smaller RTTs are probably better connected to other ISPs, meaning that they have more interconnections in more widely distributed geographic locations. ' + 
					'Average: the average latency of data transfers from the server to the client. This is calculated as the sum of round trip times sampled during the test against the number of samples, reported in milliseconds.' +
					'Comparing Average and Minimum RTTs provides an estimate of the average delay caused by queuing traffic in the network. '
				},
				{
					'term': 'Packet retransmission rate ',
					'def': 'The fraction of packets (bundles of Internet data) that need to be sent more than once to deliver complete data.  A big part of the Internet\'s robustness comes from its ability to repair missing data by having it retransmitted. Data can be lost due to congestion or other problems in the network. The repair process normally has no explicit symptoms except it does take time and hurts performance.  The retransmission rate is a measure of how much difficulty the network is having delivering the data in the first place, and provides clues as to how much the attached computers had to slow down to repair the losses.'
				}
			]
		}
	]
	

	var sectionData = [
		{id: 'Our Tool', copy: toolCopy },
		{id: 'The Internet', copy: internetCopy}
	]
	var sections;
	function init() {
		div = d3.select('#help')
		$div = $(div[0][0])
		left = div.append('div').attr('class','left')
		divider =div.append('div').attr('class','divider')
		right = div.append('div').attr('class','right')

		helpModal = d3.select('#helpModal')
		helpModal.select('.helpContent').html(popupCopy)
		helpModal.select('.dontshow').on('click', function() {
			var d = d3.select(this).select('.cb')
			d.classed('active', ! d.classed('active'))
		})
		helpModal.selectAll('.helpContent .buttons li').on('click', closeHelpPopup)
		if(mlabOpenInternet.utils.getCookie(popupDontShowCookiename) !== 'true') {
			helpModal.style('display','block')
		}
		sections = left.selectAll('section').data(sectionData)
		sections.enter().append("section")
			.html(function(d) {
				return d.copy
			})
		sections.classed('active', function(d,i) {
			return i === 0
		})

		right.append('div').attr('class','rightLabel').text('Definitions')
		

		var defLinks = right.append('ul').attr('class','defLinks cf').selectAll('li').data(defData)
		defLinks.enter().append('li').append('a').attr('src', function(d) {
			
		}).text(function(d) {
			return d.label
		})
		defLinks.on('click', clickDefType)
		
		var defs = d3.merge(_.map(defData, function(d) { 
			_.each(d.terms, function(term) {
				term.type = d.label
			})
			return d.terms 
		}))
		defs.sort(function(a,b) {
			if(a.term > b.term) {
				return 1
			}
			return -1
		})
		var terms = right.selectAll('div.termContainer').data(defs)
		terms.enter().append('div').attr('class',function(d,i) {
			return 'termContainer collapsed termContainer-' + d.type
		})
		terms.append('div').text(function(d) { return d.term }).attr('class','term')
		terms.append('div').text(function(d) { return d.def }).attr('class','def')
		terms.selectAll('.def').each(function(d) {
			var defDiv = d3.select(this)
			var $defDiv = $(this)
			var h = +$defDiv.outerHeight();
			defDiv.attr('data-h', h)
			while(h > defaultDefHeight) {
				$defDiv.text(function(index, text) {
					var reg = /\W*\s(\S)*$/
					return text.replace(reg , '…');
				})
				h = + $defDiv.outerHeight()
			}
			defDiv.attr('data-placeholder', $defDiv.text())
				.style('height', defaultDefHeight + 'px')
		})
		terms.on('click', clickTerm)

		

		_.defer(function() {
			var height = $(left[0][0]).height();
			$(divider[0][0]).height(height + bottomPadding)
			$(right[0][0]).height(height)
			$div.height(height + bottomPadding)
			terms.style('display','none')
			_.defer(function() {
				terms.style('display', 'block')
			})
		})

		var words = div.selectAll('a[data-word]')
		.each(function(word) {
			var word = d3.select(this)
			word.append('span').text(word.text())
			word.remove();
		})
		
	}
	function clickDefType(d) {
		console.log(this)
		var div = d3.select(this);
		var isActive = div.classed('active')
		right.selectAll('.defLinks li').classed('active', false)
		if(isActive) {
			//show all
			right.selectAll('.termContainer').style('display','block')
		} else {
			//show just these
			right.selectAll('.termContainer').style('display',function(term,i) {
				if(term.type === d.label) {
					return 'block'
				}
				return 'none'
			})
		}
		div.classed('active', ! isActive)
	}
	function clickTerm(d,i) {
		var container = d3.select(this);
		var closed = container.classed('collapsed')
		var defDiv = d3.select(this).select('.def')
		var animationHeight;
		if(closed) {
			var fullHeight = defDiv.attr('data-h')
			defDiv.text(d.def)
			animationHeight = fullHeight
		} else {
			animationHeight = defaultDefHeight
		}
		container.classed('collapsed', !closed)
		console.log(animationHeight)
		defDiv.transition().duration(600).style('height', animationHeight + 'px')
		if(!closed) {
			setTimeout(function() {
				defDiv.text(defDiv.attr('data-placeholder'))
			}, 600)
		}
	}
	function clickDefInText() {
		var tag = d3.select(this);
		var word = tag.attr('data-word')
		var $right = $(right[0][0])
		var y = $(".term:contains('" + word + "')").offset().top
		y += $right[0].scrollTop
		y -= $right.offset().top
		$right.animate({
		        scrollTop: y
		}, 1000);

	}
	function closeHelpPopup(d,i) {
		var txt = d3.select(this).text()
		if(txt === 'Explore the tool') {

		} else if(txt === 'How this works') {
			$('#controls .tabs li').eq(2).click()
		}
		var dontShow = helpModal.select('.cb').classed('active')
		if(dontShow) {
			mlabOpenInternet.utils.setCookie(popupDontShowCookiename, 'true', 30)
		}
		helpModal.style('display','none')
	}
	function show() {
		var curTab = mlabOpenInternet.controls.getHelpTab()
		console.log(curTab)
		sections.classed('active', function(d,i) {
			return d.id === curTab
		})


		$div.show()

		var height = $(left[0][0]).height();
		$(divider[0][0]).height(height + bottomPadding)
		$(right[0][0]).height(height)
		$div.height(height + bottomPadding)
		mlabOpenInternet.controls.updateHash()
			
	}
	exports.init = init
	exports.show = show
	exports.hide = function() { $div.hide() }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.help = exports;
	
})()