import { saveMatch, listMatches, loadMatch, deleteAllMatches } from './db.js';
import {
	createMatch,
	startOver,
	addBall,
	undoBall,
	oversText,
	currentOverNeedsBowler,
	endInnings,
	canStartSecondInnings,
	startSecondInnings,
	computeResult,
	ballTotalForUI,
} from './cricket.js';
import { computeBattingStats, computeBowlingStats } from './stats.js';
import { renderAllGraphs, renderBatsman } from './graphs.js';

let match = null;

const teamAName = document.getElementById('teamAName');
const teamBName = document.getElementById('teamBName');
const teamAPlayers = document.getElementById('teamAPlayers');
const teamBPlayers = document.getElementById('teamBPlayers');
const oversLimit = document.getElementById('oversLimit');
const batFirst = document.getElementById('batFirst');

const btnNewMatch = document.getElementById('btnNewMatch');
const matchSelect = document.getElementById('matchSelect');
const btnLoadMatch = document.getElementById('btnLoadMatch');
const btnResetAll = document.getElementById('btnResetAll');

const btnShare = document.getElementById('btnShare');
const btnShareImg = document.getElementById('btnShareImg');

const liveCard = document.getElementById('liveCard');
const controlCard = document.getElementById('controlCard');

const scoreEl = document.getElementById('score');
const infoEl = document.getElementById('info');
const matchLine = document.getElementById('matchLine');
const chaseLine = document.getElementById('chaseLine');

const strikerSelect = document.getElementById('strikerSelect');
const nonStrikerSelect = document.getElementById('nonStrikerSelect');
const bowlerSelect = document.getElementById('bowlerSelect');

const btnStartOver = document.getElementById('btnStartOver');
const btnUndo = document.getElementById('btnUndo');
const btnEndInnings = document.getElementById('btnEndInnings');
const btnStart2nd = document.getElementById('btnStart2nd');

const btnWD = document.getElementById('btnWD');
const btnNB = document.getElementById('btnNB');
const btnWicket = document.getElementById('btnWicket');

const oversView = document.getElementById('oversView');
const logEl = document.getElementById('log');
const overHint = document.getElementById('overHint');

const battingTable = document.getElementById('battingTable');
const bowlingTable = document.getElementById('bowlingTable');

const batsmanGraphSelect = document.getElementById('batsmanGraphSelect');

function parsePlayers(text) {
	return text
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
}

function currentInnings() {
	return match.innings.at(-1);
}

function setVisibleLive(on) {
	liveCard.style.display = on ? '' : 'none';
	controlCard.style.display = on ? '' : 'none';
}

async function persist() {
	if (!match) return;
	match.updatedAt = Date.now();
	await saveMatch(structuredClone(match));
	await refreshMatchList();
}

async function refreshMatchList() {
	const matches = await listMatches();
	matchSelect.innerHTML =
		`<option value="">Select saved match…</option>` +
		matches
			.map((m) => {
				const label = `${new Date(
					m.createdAt
				).toLocaleDateString()} • ${m.teams?.A?.name ?? 'A'} vs ${
					m.teams?.B?.name ?? 'B'
				}`;
				return `<option value="${m.id}">${label}</option>`;
			})
			.join('');
}

function availableBatters(inn) {
	const battingPlayers = match.teams[inn.batting].players;
	return battingPlayers.filter((p) => !inn.outPlayers.includes(p));
}

function populateBatterSelects(inn) {
	const avail = availableBatters(inn);

	strikerSelect.innerHTML = avail
		.map(
			(p) =>
				`<option ${p === inn.striker ? 'selected' : ''}>${p}</option>`
		)
		.join('');

	nonStrikerSelect.innerHTML = avail
		.filter((p) => p !== inn.striker)
		.map(
			(p) =>
				`<option ${
					p === inn.nonStriker ? 'selected' : ''
				}>${p}</option>`
		)
		.join('');

	strikerSelect.onchange = async () => {
		inn.striker = strikerSelect.value;
		await persist();
		render();
	};
	nonStrikerSelect.onchange = async () => {
		inn.nonStriker = nonStrikerSelect.value;
		await persist();
		render();
	};
}

function populateBowlerSelect(inn) {
	const bowlingPlayers = match.teams[inn.bowling].players;
	bowlerSelect.innerHTML =
		`<option value="">Select bowler…</option>` +
		bowlingPlayers.map((p) => `<option>${p}</option>`).join('');
}

function renderOvers(inn) {
	const lines = inn.overs.map((o, i) => {
		const runs = o.balls.reduce((sum, b) => sum + ballTotalForUI(b), 0);
		const legal = o.balls.filter(
			(b) => !['WD', 'NB'].includes(b.type)
		).length;
		return `Over ${i + 1} • ${
			o.bowlerId
		} • ${runs} runs • ${legal}/6 legal`;
	});
	oversView.textContent = lines.join('\n') || '—';
}

function renderLog(inn) {
	const lines = [];
	inn.overs.forEach((o, oi) => {
		o.balls.forEach((b, bi) => {
			const w = b.wicket ? 'W ' : '';
			const tag = b.type ? `${b.type} ` : '';
			lines.push(
				`${oi + 1}.${bi + 1} ${o.bowlerId} → ${
					b.striker
				}  ${w}${tag}+${ballTotalForUI(b)}`
			);
		});
	});
	logEl.textContent = lines.join('\n') || '—';
}

function renderTables(inn) {
	const bat = computeBattingStats(inn);
	const bowl = computeBowlingStats(inn);

	battingTable.innerHTML =
		`<tr><th>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>` +
		Object.entries(bat)
			.map(([n, s]) => {
				const sr = s.balls
					? ((s.runs / s.balls) * 100).toFixed(1)
					: '0.0';
				return `<tr>
        <td>${n}${s.out ? '' : '*'}</td><td>${s.runs}</td><td>${s.balls}</td>
        <td>${s.fours}</td><td>${s.sixes}</td><td>${sr}</td>
      </tr>`;
			})
			.join('');

	bowlingTable.innerHTML =
		`<tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr>` +
		Object.entries(bowl)
			.map(
				([n, s]) =>
					`<tr><td>${n}</td><td>${oversText(s.balls)}</td><td>${
						s.runs
					}</td><td>${s.wickets}</td></tr>`
			)
			.join('');
}

function renderGraphs(inn) {
	const batters = match.teams[inn.batting].players;
	batsmanGraphSelect.innerHTML = batters
		.map((p) => `<option>${p}</option>`)
		.join('');
	batsmanGraphSelect.onchange = () =>
		renderBatsman(inn, batsmanGraphSelect.value);

	const defaultB = batsmanGraphSelect.value || inn.striker;
	renderAllGraphs(inn, defaultB);
}

function renderChaseAndResult() {
	const inn = currentInnings();

	// Show Start 2nd button only when appropriate
	btnStart2nd.style.display = canStartSecondInnings(match) ? '' : 'none';

	if (match.innings.length === 1) {
		chaseLine.textContent = inn.completed
			? 'Innings 1 complete'
			: 'Innings 1 in progress';
		return;
	}

	const inn1 = match.innings[0];
	const inn2 = match.innings[1];
	const target = inn2.target ?? inn1.score.runs + 1;

	if (inn2.completed && match.result) {
		chaseLine.textContent = `Target: ${target}\n${match.result}`;
		return;
	}

	const need = Math.max(0, target - inn2.score.runs);
	const ballsLeft = match.oversLimit * 6 - inn2.score.legalBalls;

	chaseLine.textContent =
		inn.inningsNo === 2
			? `Target: ${target} • Need: ${need} off ${ballsLeft} balls`
			: `Target: ${target}`;
}

function render() {
	if (!match) return;

	const inn = currentInnings();
	setVisibleLive(true);

	matchLine.textContent = `${match.teams.A.name} vs ${match.teams.B.name} • ${match.oversLimit} overs • Innings ${inn.inningsNo}`;
	scoreEl.textContent = `${inn.score.runs}/${inn.score.wickets} (${oversText(
		inn.score.legalBalls
	)})`;

	infoEl.textContent =
		`Batting: ${match.teams[inn.batting].name}\n` +
		`Striker: ${inn.striker}\n` +
		`Non-striker: ${inn.nonStriker}\n` +
		`Bowler: ${inn.currentOver?.bowlerId ?? '—'}\n` +
		`Status: ${inn.completed ? 'Completed' : 'Live'}`;

	populateBatterSelects(inn);
	populateBowlerSelect(inn);

	renderOvers(inn);
	renderLog(inn);
	renderTables(inn);
	renderGraphs(inn);

	// Over hint
	if (inn.completed) {
		overHint.textContent = 'Innings complete.';
	} else if (currentOverNeedsBowler(inn)) {
		overHint.textContent =
			'Start the next over: select a bowler and tap “Start Over”.';
	} else {
		const legalInOver = inn.currentOver.balls.filter(
			(b) => !['WD', 'NB'].includes(b.type)
		).length;
		overHint.textContent = `Over in progress: ${legalInOver}/6 legal balls`;
	}

	// result
	computeResult(match);
	renderChaseAndResult();
}

// ----------------- Sharing (TEXT) -----------------
function scoreboardText() {
	const inn1 = match.innings[0];
	const A = match.teams.A.name;
	const B = match.teams.B.name;

	const i1Team = match.teams[inn1.batting].name;
	const i1 = `${i1Team}: ${inn1.score.runs}/${
		inn1.score.wickets
	} (${oversText(inn1.score.legalBalls)})`;

	let i2 = '';
	if (match.innings.length >= 2) {
		const inn2 = match.innings[1];
		const i2Team = match.teams[inn2.batting].name;
		const target = inn2.target ?? inn1.score.runs + 1;
		i2 = `\n${i2Team}: ${inn2.score.runs}/${
			inn2.score.wickets
		} (${oversText(inn2.score.legalBalls)})  Target: ${target}`;
	}

	const res = match.result ? `\nResult: ${match.result}` : '';
	return `${A} vs ${B}\n${i1}${i2}${res}`;
}

btnShare.onclick = async () => {
	if (!match) return alert('No match loaded');
	const text = scoreboardText();

	if (navigator.share) {
		try {
			await navigator.share({ title: 'Cricket Score', text });
			return;
		} catch {
			return;
		}
	}

	try {
		await navigator.clipboard.writeText(text);
		alert('Copied. Paste into WhatsApp.');
	} catch {
		prompt('Copy this:', text);
	}
};

// ----------------- Sharing (IMAGE) -----------------
function buildScorecardLines() {
	const inn1 = match.innings[0];
	const A = match.teams.A.name;
	const B = match.teams.B.name;

	const teamInn1 = match.teams[inn1.batting].name;
	const line1 = `${teamInn1}: ${inn1.score.runs}/${
		inn1.score.wickets
	} (${oversText(inn1.score.legalBalls)})`;

	let line2 = '';
	let chase = '';
	let res = match.result ? `Result: ${match.result}` : '';

	if (match.innings.length >= 2) {
		const inn2 = match.innings[1];
		const teamInn2 = match.teams[inn2.batting].name;
		const target = inn2.target ?? inn1.score.runs + 1;
		line2 = `${teamInn2}: ${inn2.score.runs}/${
			inn2.score.wickets
		} (${oversText(inn2.score.legalBalls)})`;
		const need = Math.max(0, target - inn2.score.runs);
		const ballsLeft = match.oversLimit * 6 - inn2.score.legalBalls;
		chase = `Target ${target} • Need ${need} off ${ballsLeft} balls`;
	} else {
		chase = inn1.completed ? 'Innings 1 complete' : 'Innings 1 in progress';
	}

	return [
		`${A} vs ${B}`,
		`Overs: ${match.oversLimit} • ${new Date(
			match.createdAt
		).toLocaleString()}`,
		'',
		line1,
		line2 ? line2 : null,
		chase ? chase : null,
		'',
		res ? res : null,
	].filter(Boolean);
}

function roundRect(ctx, x, y, w, h, r) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}

function renderScorecardToCanvas() {
	const lines = buildScorecardLines();
	const width = 1080;
	const padding = 64;
	const lineH = 52;
	const height = padding * 2 + lines.length * lineH + 120;

	const c = document.createElement('canvas');
	c.width = width;
	c.height = height;
	const ctx = c.getContext('2d');

	// background
	ctx.fillStyle = '#0b0f17';
	ctx.fillRect(0, 0, width, height);

	// card
	const cardX = 40,
		cardY = 40,
		cardW = width - 80,
		cardH = height - 80;
	ctx.fillStyle = '#151c2f';
	roundRect(ctx, cardX, cardY, cardW, cardH, 28);
	ctx.fill();

	// accent bar
	ctx.fillStyle = '#6d5efc';
	roundRect(ctx, cardX, cardY, cardW, 12, 12);
	ctx.fill();

	// Title
	let y = cardY + 90;
	ctx.fillStyle = '#e9eefc';
	ctx.font = '900 56px system-ui, -apple-system, Segoe UI, Roboto';
	ctx.fillText(lines[0], cardX + padding, y);

	// Subtitle
	y += 62;
	ctx.fillStyle = '#9fb0d0';
	ctx.font = '600 30px system-ui, -apple-system, Segoe UI, Roboto';
	ctx.fillText(lines[1], cardX + padding, y);

	// Body
	y += 70;
	for (let i = 2; i < lines.length; i++) {
		const line = lines[i];
		if (line === '') {
			y += 18;
			continue;
		}

		if (line.startsWith('Result:')) {
			ctx.fillStyle = '#00c853';
			ctx.font = '900 42px system-ui, -apple-system, Segoe UI, Roboto';
		} else if (line.startsWith('Target')) {
			ctx.fillStyle = '#ff9800';
			ctx.font = '850 38px system-ui, -apple-system, Segoe UI, Roboto';
		} else {
			ctx.fillStyle = '#e9eefc';
			ctx.font = '850 44px system-ui, -apple-system, Segoe UI, Roboto';
		}

		ctx.fillText(line, cardX + padding, y);
		y += lineH;
	}

	// footer small
	ctx.fillStyle = '#9fb0d0';
	ctx.font = '600 26px system-ui, -apple-system, Segoe UI, Roboto';
	ctx.fillText(
		'Scored with Offline Cricket Scorer',
		cardX + padding,
		height - 70
	);

	return c;
}

btnShareImg.onclick = async () => {
	if (!match) return alert('No match loaded');
	const canvas = renderScorecardToCanvas();

	const blob = await new Promise((resolve) =>
		canvas.toBlob(resolve, 'image/png', 1.0)
	);
	if (!blob) return alert('Could not create image.');

	const file = new File([blob], 'scorecard.png', { type: 'image/png' });

	if (
		navigator.canShare &&
		navigator.share &&
		navigator.canShare({ files: [file] })
	) {
		try {
			await navigator.share({
				title: 'Cricket Scorecard',
				files: [file],
			});
			return;
		} catch {
			return;
		}
	}

	// fallback: open image tab
	const url = URL.createObjectURL(blob);
	window.open(url, '_blank');
	setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ----------------- UI actions -----------------
btnNewMatch.onclick = async () => {
	const A = teamAName.value.trim() || 'Team A';
	const B = teamBName.value.trim() || 'Team B';
	const Aplayers = parsePlayers(teamAPlayers.value);
	const Bplayers = parsePlayers(teamBPlayers.value);
	const limit = Number(oversLimit.value || 10);
	const first = batFirst.value;

	if (Aplayers.length < 2) return alert('Team A: add at least 2 players');
	if (Bplayers.length < 1) return alert('Team B: add at least 1 player');

	match = createMatch({
		teamAName: A,
		teamBName: B,
		teamAPlayers: Aplayers,
		teamBPlayers: Bplayers,
		oversLimit: limit,
		batFirst: first,
	});

	await persist();
	render();
};

btnLoadMatch.onclick = async () => {
	const id = matchSelect.value;
	if (!id) return;
	match = await loadMatch(id);
	if (!match) return alert('Match not found');
	render();
};

btnResetAll.onclick = async () => {
	if (!confirm('Delete ALL saved matches on this device?')) return;
	await deleteAllMatches();
	match = null;
	setVisibleLive(false);
	await refreshMatchList();
};

btnStartOver.onclick = async () => {
	if (!match) return;
	const inn = currentInnings();
	if (inn.completed) return alert('Innings is complete.');
	const bowler = bowlerSelect.value;
	if (!bowler) return alert('Select a bowler');
	if (!currentOverNeedsBowler(inn)) return;
	startOver(inn, bowler);
	await persist();
	render();
};

btnUndo.onclick = async () => {
	if (!match) return;
	undoBall(match);
	await persist();
	render();
};

btnEndInnings.onclick = async () => {
	if (!match) return;
	endInnings(match);
	computeResult(match);
	await persist();
	render();
};

btnStart2nd.onclick = async () => {
	if (!match) return;
	startSecondInnings(match);
	await persist();
	render();
};

document.querySelectorAll('[data-run]').forEach((btn) => {
	btn.onclick = async () => {
		if (!match) return;
		const inn = currentInnings();
		if (inn.completed) return alert('Innings is complete.');
		if (currentOverNeedsBowler(inn))
			return alert('Start over: select a bowler first');
		addBall(match, { runs: Number(btn.dataset.run) });
		computeResult(match);
		await persist();
		render();
	};
});

btnWD.onclick = async () => {
	if (!match) return;
	const inn = currentInnings();
	if (inn.completed) return alert('Innings is complete.');
	if (currentOverNeedsBowler(inn))
		return alert('Start over: select a bowler first');
	addBall(match, { type: 'WD', runs: 0 });
	computeResult(match);
	await persist();
	render();
};

btnNB.onclick = async () => {
	if (!match) return;
	const inn = currentInnings();
	if (inn.completed) return alert('Innings is complete.');
	if (currentOverNeedsBowler(inn))
		return alert('Start over: select a bowler first');
	addBall(match, { type: 'NB', runs: 0 });
	computeResult(match);
	await persist();
	render();
};

btnWicket.onclick = async () => {
	if (!match) return;
	const inn = currentInnings();
	if (inn.completed) return alert('Innings is complete.');
	if (currentOverNeedsBowler(inn))
		return alert('Start over: select a bowler first');

	addBall(match, { wicket: true, runs: 0 });

	const avail = availableBatters(inn).filter(
		(p) => p !== inn.striker && p !== inn.nonStriker
	);
	if (avail.length === 0) {
		alert('All out!');
	} else {
		const next = prompt('New batsman:', avail[0]);
		if (next && avail.includes(next)) {
			inn.striker = next;
		} else {
			alert('Kept striker unchanged (pick a valid player next time).');
		}
	}

	computeResult(match);
	await persist();
	render();
};

// boot
await refreshMatchList();
