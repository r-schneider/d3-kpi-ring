//data
function getRandomFloat(min, max) {
	let number = Math.random() * (max - min) + min;
	return +number.toFixed(1);
}

const data = [
	{
		name: 'Sales',
		value: getRandomFloat(0, 100),
	},
	{
		name: 'Profit',
		value: getRandomFloat(0, 100),
	},
	{
		name: 'Cost',
		value: getRandomFloat(0, 100),
	},
];

render();

window.addEventListener('resize', render);

function render() {
	let properties = {
		width: document.body.clientWidth,
		height: document.body.clientHeight,
		startAngle: 0,
		endAngle: Math.PI * 2,
		ringPadding: 3,
		ringDomain: [0, 100],
		bgColor: '#eeeff0',
		dataColors: ['#8f70ff', '#6794de', '#73d3ff'],
		fontColor: '#5e5e5e',
	};

	createVisualization(d3.select('#chart'), properties);
}

function createVisualization(container, props) {
	let {
		width,
		height,
		startAngle,
		endAngle,
		ringPadding,
		ringDomain,
		bgColor,
		dataColors,
		fontColor,
	} = props;

	const outerRadius = Math.min(width, height) / 4;
	const innerRadius = outerRadius * 0.82;
	const ringWidth = outerRadius - innerRadius;
	const rectWidth = Math.max(ringWidth / 1.5, 12);
	const rectHeight = rectWidth / 6;
	const fontSize = Math.max((ringWidth / 2).toFixed(0), 11);

	//visualization
	let scale = d3.scaleLinear().domain(ringDomain).range([startAngle, endAngle]);

	let arc = d3.arc().startAngle(startAngle);

	let svg = container.selectAll('svg').data([null]);
	svg.exit().remove();
	svg = svg
		.enter()
		.append('svg')
		.merge(svg)
		.attr('width', width)
		.attr('height', height);

	let arcGroup = svg.selectAll('g').data([null]);
	arcGroup.exit().remove();
	arcGroup = arcGroup
		.enter()
		.append('g')
		.attr('class', 'arc-group')
		.merge(arcGroup)
		.attr('transform', translation(width / 2, height / 2.5));

	const setRadiuses = (d, i, endAngle) => {
		d.endAngle = endAngle;
		d.innerRadius = innerRadius - ringWidth * i - ringPadding * i;
		d.outerRadius = outerRadius - ringWidth * i - ringPadding * i;
	};

	let bgRings = arcGroup.selectAll('.bg-ring').data(data);
	bgRings.exit().remove();
	bgRings = bgRings
		.enter()
		.append('path')
		.attr('class', 'bg-ring')
		.merge(bgRings)
		.each((d, i) => {
			setRadiuses(d, i, endAngle);
		})
		.attr('d', arc)
		.attr('fill', bgColor);

	let dataRings = arcGroup.selectAll('.data-ring').data(data);
	dataRings.exit().remove();
	dataRings = dataRings
		.enter()
		.append('path')
		.attr('class', 'data-ring')
		.merge(dataRings)
		.each((d, i) => {
			setRadiuses(d, i, startAngle);
		})
		.attr('d', arc)
		.attr('fill', (d, i) => dataColors[i]);

	data.forEach((element, index) => {
		let ring = dataRings.filter((d, i) => {
			return i === index;
		});
		ring
			.transition()
			.duration(750)
			.attrTween('d', arcTween(scale(data[index].value)));
	});

	function arcTween(a) {
		return (d) => {
			let interpolate = d3.interpolate(d.endAngle, a);
			return (t) => {
				if (interpolate(t) < endAngle) {
					d.endAngle = interpolate(t);
				} else {
					d.endAngle = endAngle;
				}
				return arc(d);
			};
		};
	}

	//legend
	let legend = svg.selectAll('.legend').data([null]);
	legend.exit().remove();

	legend = legend
		.enter()
		.append('g')
		.attr('class', 'legend')
		.merge(legend)
		.attr(
			'transform',
			translation(
				width / 2 - bbox(arcGroup).width / 2,
				height / 2 + bbox(arcGroup).height / 2.2
			)
		);

	let tooltip = legend.selectAll('.tooltip').data([null]);
	tooltip.exit().remove();

	tooltip = tooltip
		.enter()
		.append('rect')
		.attr('class', 'tooltip')
		.attr('rx', 3)
		.style('opacity', '0.3')
		.merge(tooltip)
		.attr('visibility', 'hidden');

	let wrapper = legend.selectAll('.wrapper').data(data);
	wrapper.exit().remove();

	wrapper = wrapper.enter().append('g').attr('class', 'wrapper');

	wrapper
		.append('rect')
		.attr('class', 'rect')
		.attr('fill', (d, i) => dataColors[i]);

	wrapper
		.append('text')
		.attr('class', 'text')
		.text((d) => `${d.name}: ${d.value}%`);

	wrapper = wrapper.merge(wrapper);

	wrapper
		.selectAll('.rect')
		.attr('width', rectWidth)
		.attr('height', rectHeight)
		.attr('rx', 2);

	wrapper
		.selectAll('.text')
		.attr('font-family', 'sans-serif, Arial')
		.attr('dominant-baseline', 'central')
		.attr('text-anchor', 'start')
		.attr('fill', fontColor)
		.attr('font-size', fontSize);

	let wrapperY = 0;
	let lineCount = 0;
	let tooltipY = [0];

	wrapper.each(function (d, i, arr) {
		let wrapper = d3.select(this);
		let text = wrapper.select('text');
		let bboxHeight = bbox(text).height;
		wrapper.attr('transform', translation(0, wrapperY));
		text.call(wrap, bbox(arcGroup).width);
		wrapperY += bboxHeight * (2 + lineCount);
		lineCount -= lineCount;
		tooltipY.push(wrapperY);
	});

	function wrap(text, width) {
		text.each(function () {
			var text = d3.select(this),
				words = text.text().split(/\s+/).reverse(),
				word,
				line = [],
				lineNumber = 0,
				lineHeight = 1.3, // ems
				y = lineHeight,
				dy = 0,
				tspan = text
					.text(null)
					.append('tspan')
					.attr('x', rectWidth + rectHeight)
					.attr('y', y)
					.attr('dy', dy + 'em');
			while ((word = words.pop())) {
				line.push(word);
				tspan.text(line.join(' '));
				if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(' '));
					line = [word];
					tspan = text
						.append('tspan')
						.attr('x', 0)
						.attr('y', y)
						.attr('dy', `${++lineNumber * lineHeight + dy}em`)
						.text(word);
					lineCount++;
				}
			}
		});
	}

	//interaction
	dataRings.on('mouseover', (d, i, nodes) => {
		d3.selectAll(nodes)
			.filter((node) => {
				let current = d;
				return node != current;
			})
			.style('opacity', '0.5');
		let wrapperBbox = wrapper.nodes()[i].getBBox();
		tooltip
			.attr('width', wrapperBbox.width * 1.02)
			.attr('height', wrapperBbox.height * 1.1)
			.attr('y', tooltipY[i] - fontSize / 2)
			.attr('fill', dataColors[i])
			.attr('visibility', 'visible');
	});

	dataRings.on('mouseout', (d, i, nodes) => {
		d3.selectAll(nodes).style('opacity', '1');
		tooltip.attr('visibility', 'hidden');
	});
}

//utils
function translation(x, y) {
	return `translate(${x}, ${y})`;
}

function bbox(selection) {
	return selection.node().getBBox();
}
