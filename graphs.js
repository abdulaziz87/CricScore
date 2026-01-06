let wormChart, rrChart, batsmanChart;

export function renderAllGraphs(innings, batsmanName) {
	renderWorm(innings);
	renderRunRate(innings);
	if (batsmanName) renderBatsman(innings, batsmanName);
}

export function renderBatsman(innings, batsman) {
	const data = [];
	let total = 0;

	for (const over of innings.overs) {
		for (const ball of over.balls) {
			if (ball.striker === batsman) {
				total += ball.runs || 0;
				data.push(total);
			}
		}
	}

	if (batsmanChart) batsmanChart.destroy();
	batsmanChart = new Chart(document.getElementById('batsmanChart'), {
		type: 'line',
		data: {
			labels: data.map((_, i) => i + 1),
			datasets: [
				{ label: batsman, data, borderColor: '#6d5efc', tension: 0.25 },
			],
		},
		options: themedOptions(),
	});
}

function renderWorm(innings) {
	const totals = [];
	let runs = 0;

	for (const over of innings.overs) {
		for (const ball of over.balls) {
			const baseExtra = ball.type === 'WD' || ball.type === 'NB' ? 1 : 0;
			runs += (ball.runs || 0) + baseExtra;
			totals.push(runs);
		}
	}

	if (wormChart) wormChart.destroy();
	wormChart = new Chart(document.getElementById('wormChart'), {
		type: 'line',
		data: {
			labels: totals.map((_, i) => i + 1),
			datasets: [
				{
					label: 'Runs',
					data: totals,
					borderColor: '#00c853',
					tension: 0.25,
				},
			],
		},
		options: themedOptions(),
	});
}

function renderRunRate(innings) {
	const rr = [];
	let runs = 0;
	let legalBalls = 0;

	innings.overs.forEach((over) => {
		over.balls.forEach((ball) => {
			const baseExtra = ball.type === 'WD' || ball.type === 'NB' ? 1 : 0;
			runs += (ball.runs || 0) + baseExtra;
			if (!['WD', 'NB'].includes(ball.type)) legalBalls++;
		});
		rr.push(
			legalBalls > 0 ? Number((runs / (legalBalls / 6)).toFixed(2)) : 0
		);
	});

	if (rrChart) rrChart.destroy();
	rrChart = new Chart(document.getElementById('rrChart'), {
		type: 'bar',
		data: {
			labels: rr.map((_, i) => `Over ${i + 1}`),
			datasets: [
				{ label: 'Run Rate', data: rr, backgroundColor: '#ff9800' },
			],
		},
		options: themedOptions(),
	});
}

function themedOptions() {
	return {
		responsive: true,
		plugins: { legend: { labels: { color: '#e9eefc' } } },
		scales: {
			x: {
				ticks: { color: '#9fb0d0' },
				grid: { color: 'rgba(255,255,255,.06)' },
			},
			y: {
				ticks: { color: '#9fb0d0' },
				grid: { color: 'rgba(255,255,255,.06)' },
			},
		},
	};
}
