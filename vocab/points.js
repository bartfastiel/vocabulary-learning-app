// vocab/points.js
//
// Handles all point, streak, and treasure logic.
// Mirrors the original inline implementation exactly.
//

export class PointsManager {
    constructor(root) {
        // root = shadowRoot of <app-shell>
        this.root = root;

        this.pointsEl = root.getElementById("points");
        this.streakEl = root.getElementById("streak");
        this.streakRecordEl = root.getElementById("streak-record");
        this.shipEl = root.getElementById("ship");
        this.treasureEl = root.getElementById("treasure");

        this.points = parseInt(localStorage.getItem("points") || "0");
        this.streak = 0;
        this.streakRecord = parseInt(localStorage.getItem("streakRecord") || "0");

        this.streakRecordEl.textContent = this.streakRecord.toString();
        this.updatePoints(0); // ensure UI sync
    }

    // --- called from answer components ---
    updatePoints(delta) {
        this.points += delta;
        this.pointsEl.textContent = this.points.toString();
        localStorage.setItem("points", this.points.toString());
        this.checkTreasure();
    }

    updateStreak(isCorrect) {
        const body = document.body;

        if (isCorrect) {
            this.streak++;
            if (this.streak > this.streakRecord) {
                this.streakRecord = this.streak;
                localStorage.setItem("streakRecord", this.streakRecord.toString());
                this.streakRecordEl.textContent = this.streakRecord.toString();
            }
            this.streakEl.textContent = this.streak.toString();
            body.classList.remove("streak-broken");

            if (this.streak >= 20) body.classList.add("streak-20");
            else if (this.streak >= 15) body.classList.add("streak-15");
            else if (this.streak >= 10) body.classList.add("streak-10");
        } else {
            this.streak = 0;
            this.streakEl.textContent = "0";
            body.classList.remove("streak-10", "streak-15", "streak-20");
            body.classList.add("streak-broken");
        }
    }

    // --- helpers ---
    checkTreasure() {
        if (this.points < 5) {
            this.treasureEl.classList.add("disabled");
        } else {
            this.treasureEl.classList.remove("disabled");
        }
    }
}
