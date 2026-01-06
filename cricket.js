export function createMatch({
	teamAName,
	teamBName,
	teamAPlayers,
	teamBPlayers,
	oversLimit,
	batFirst,
}) {
	const id = crypto.randomUUID();
	const now = Date.now();

	const teams = {
		A: { name: teamAName, players: teamAPlayers },
		B: { name: teamBName, players: teamBPlayers },
	};

	const batting = batFirst;
	const bowling = batFirst === 'A' ? 'B' : 'A';

	const innings = [
		{
			inningsNo: 1,
			batting,
			bowling,
			striker: teams[batting].players[0] ?? null,
			nonStriker:
				teams[batting].players[1] ?? teams[batting].players[0] ?? null,
			outPlayers: [],
			overs: [],
			currentOver: null,
			score: { runs: 0, wickets: 0, legalBalls: 0 },
			oversLimit,
			target: null,
			completed: false,
		},
	];

	return {
		id,
		createdAt: now,
		updatedAt: now,
		teams,
		batFirst,
		oversLimit,
		innings,
		history: [],
		result: null,
	};
}

export function startOver(innings, bowlerName) {
	innings.currentOver = {
		id: crypto.randomUUID(),
		bowlerId: bowlerName,
		balls: [],
	};
	innings.overs.push(innings.currentOver);
}

function isLegal(ballType) {
	return !['WD', 'NB'].includes(ballType);
}
function baseExtra(ballType) {
	return ballType === 'WD' || ballType === 'NB' ? 1 : 0;
}
function ballTotal(ball) {
	return (ball.runs || 0) + baseExtra(ball.type);
}

export function addBall(match, data) {
	const inn = match.innings.at(-1);
	if (inn.completed) return;
	if (!inn.currentOver) throw new Error('Start the over (select bowler)');

	const before = structuredClone(inn);

	const type = data.type || null;
	const legal = isLegal(type);

	const entry = {
		over: inn.overs.length - 1,
		ball: inn.currentOver.balls.length,
		striker: inn.striker,
		nonStriker: inn.nonStriker,
		bowler: inn.currentOver.bowlerId,
		runs: data.runs || 0,
		type,
		wicket: !!data.wicket,
	};

	inn.score.runs += ballTotal(entry);

	if (entry.wicket) {
		inn.score.wickets += 1;
		inn.outPlayers.push(inn.striker);
	}

	if (legal) {
		inn.score.legalBalls += 1;
		if ((entry.runs || 0) % 2 === 1)
			[inn.striker, inn.nonStriker] = [inn.nonStriker, inn.striker];
	}

	inn.currentOver.balls.push(entry);

	const legalBallsInOver = inn.currentOver.balls.filter((b) =>
		isLegal(b.type)
	).length;
	if (legal && legalBallsInOver === 6) {
		[inn.striker, inn.nonStriker] = [inn.nonStriker, inn.striker];
		inn.currentOver = null;
	}

	// auto complete by overs or all out
	const maxBalls = inn.oversLimit * 6;
	if (inn.score.legalBalls >= maxBalls || inn.score.wickets >= 10) {
		inn.completed = true;
		inn.currentOver = null;
	}

	// auto complete chase
	if (
		inn.inningsNo === 2 &&
		inn.target != null &&
		inn.score.runs >= inn.target
	) {
		inn.completed = true;
		inn.currentOver = null;
	}

	match.history.push(before);
}

export function undoBall(match) {
	const inn = match.innings.at(-1);
	const prev = match.history.pop();
	if (prev) Object.assign(inn, prev);
}

export function endInnings(match) {
	const inn = match.innings.at(-1);
	inn.completed = true;
	inn.currentOver = null;
}

export function canStartSecondInnings(match) {
	return match.innings.length === 1 && match.innings[0].completed;
}

export function startSecondInnings(match) {
	if (!canStartSecondInnings(match)) return;

	const inn1 = match.innings[0];
	const target = inn1.score.runs + 1;

	const batting = inn1.bowling;
	const bowling = inn1.batting;

	const inn2 = {
		inningsNo: 2,
		batting,
		bowling,
		striker: match.teams[batting].players[0] ?? null,
		nonStriker:
			match.teams[batting].players[1] ??
			match.teams[batting].players[0] ??
			null,
		outPlayers: [],
		overs: [],
		currentOver: null,
		score: { runs: 0, wickets: 0, legalBalls: 0 },
		oversLimit: match.oversLimit,
		target,
		completed: false,
	};

	match.innings.push(inn2);
	match.result = null;
}

export function computeResult(match) {
	if (match.innings.length < 2) return null;

	const inn1 = match.innings[0];
	const inn2 = match.innings[1];
	const team1 = match.teams[inn1.batting].name;
	const team2 = match.teams[inn2.batting].name;
	const target = inn2.target ?? inn1.score.runs + 1;

	if (inn2.score.runs >= target) {
		const wicketsLeft = 10 - inn2.score.wickets;
		match.result = `${team2} won by ${wicketsLeft} wicket(s)`;
		return match.result;
	}

	if (inn2.completed) {
		const runsLeft = target - inn2.score.runs;
		match.result = `${team1} won by ${runsLeft} run(s)`;
		return match.result;
	}

	return null;
}

export function oversText(legalBalls) {
	return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function currentOverNeedsBowler(innings) {
	return !innings.currentOver;
}

export function ballTotalForUI(ball) {
	return (ball.runs || 0) + baseExtra(ball.type);
}
