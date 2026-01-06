import { oversText as oversTextFromBalls } from './cricket.js';

export function computeBattingStats(innings) {
	const s = {};
	for (const over of innings.overs) {
		for (const ball of over.balls) {
			const name = ball.striker;
			if (!s[name])
				s[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };

			if (ball.type !== 'WD') s[name].balls += 1; // wide not a ball faced
			s[name].runs += ball.runs || 0;
			if (ball.runs === 4) s[name].fours += 1;
			if (ball.runs === 6) s[name].sixes += 1;
			if (ball.wicket) s[name].out = true;
		}
	}
	return s;
}

export function computeBowlingStats(innings) {
	const s = {};
	for (const over of innings.overs) {
		const bowler = over.bowlerId;
		if (!s[bowler]) s[bowler] = { balls: 0, runs: 0, wickets: 0 };

		for (const ball of over.balls) {
			const legal = !['WD', 'NB'].includes(ball.type);
			const baseExtra = ball.type === 'WD' || ball.type === 'NB' ? 1 : 0;
			s[bowler].runs += (ball.runs || 0) + baseExtra;
			if (legal) s[bowler].balls += 1;
			if (ball.wicket) s[bowler].wickets += 1;
		}
	}
	return s;
}

export function oversText(balls) {
	return oversTextFromBalls(balls);
}
