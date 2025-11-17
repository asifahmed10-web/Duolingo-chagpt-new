/* --------------------------------------------------
   GLOBAL APP CONTROLLER
-------------------------------------------------- */

const app = {
    data: [],
    user: null,

    loadData: async function () {
        try {
            const response = await fetch("dataset.json");
            this.data = await response.json();
        } catch (err) {
            console.error("Error loading dataset:", err);
        }
    },

    shuffle: function (array) {
        let newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    saveProgress: function (type, detail) {
        let history = JSON.parse(localStorage.getItem("history") || "[]");
        history.push({
            type,
            detail,
            date: new Date().toLocaleString("en-BD")
        });
        localStorage.setItem("history", JSON.stringify(history));
    },

    getUser: function () {
        return JSON.parse(localStorage.getItem("user"));
    },

    setUser: function (user) {
        localStorage.setItem("user", JSON.stringify(user));
    }
};


/* --------------------------------------------------
    SIGNUP • LOGIN
-------------------------------------------------- */

const Auth = {
    signup: function (name, email, pass) {
        const users = JSON.parse(localStorage.getItem("users") || "[]");

        if (users.find(u => u.email === email)) {
            return { ok: false, msg: "Email already exists" };
        }

        const newUser = {
            name,
            email,
            pass,
            achievements: [],
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));

        app.setUser(newUser);
        return { ok: true };
    },

    login: function (email, pass) {
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const user = users.find(u => u.email === email && u.pass === pass);

        if (!user) {
            return { ok: false, msg: "Invalid login" };
        }

        app.setUser(user);
        return { ok: true };
    }
};


/* --------------------------------------------------
   VOCABULARY MODE
-------------------------------------------------- */

const VocabUI = {
    words: [],
    current: null,
    lock: false,

    init: function (dataset) {
        this.words = app.shuffle(dataset);
        this.loadWord();
    },

    loadWord: function () {
        if (this.words.length === 0) {
            document.getElementById("wordBox").innerHTML = "Finished!";
            return;
        }

        this.current = this.words.pop();
        document.getElementById("word").innerText = this.current.word;

        // Shuffle options
        let opts = app.shuffle([this.current.correct, ...this.current.wrong]);
        document.getElementById("opts").innerHTML = "";

        opts.forEach(opt => {
            let btn = document.createElement("button");
            btn.className = "optBtn";
            btn.innerText = opt;

            btn.onclick = () => {
                if (this.lock) return;
                this.lock = true;

                if (opt === this.current.correct) {
                    btn.classList.add("correct");
                    app.saveProgress("Vocabulary", this.current.word);

                } else {
                    btn.classList.add("wrong");
                }

                // Show Bangla translation
                document.getElementById("trans").innerText =
                    "Meaning (Bangla): " + this.current.translation;

                setTimeout(() => {
                    this.lock = false;
                    this.loadWord();
                }, 2000);
            };

            document.getElementById("opts").appendChild(btn);
        });
    }
};


/* --------------------------------------------------
    FILL IN THE GAPS MODE
-------------------------------------------------- */

const FillUI = {
    items: [],
    current: null,
    lock: false,

    init: function (dataset) {
        this.items = app.shuffle(dataset);
        this.loadItem();
    },

    loadItem: function () {
        if (this.items.length === 0) {
            document.getElementById("sentenceBox").innerText = "Finished!";
            return;
        }

        this.current = this.items.pop();

        document.getElementById("sentence").innerHTML =
            this.current.sentence.replace("....", "<input id='gapInput'>");

        document.getElementById("hint").innerText = "Hint: " + this.current.hint;

        document.getElementById("submitGap").onclick = () => {
            if (this.lock) return;

            const val = document.getElementById("gapInput").value.trim();
            this.lock = true;

            if (val.toLowerCase() === this.current.answer.toLowerCase()) {
                document.getElementById("result").innerHTML =
                    "<span style='color:green'>Correct!</span>";

                app.saveProgress("Fill-in-the-gap", this.current.answer);

            } else {
                document.getElementById("result").innerHTML =
                    "<span style='color:red'>Wrong. Correct word: " + this.current.answer + "</span>";
            }

            setTimeout(() => {
                this.lock = false;
                this.loadItem();
            }, 2000);
        };
    }
};


/* --------------------------------------------------
   DASHBOARD (PROFILE + ACHIEVEMENTS + HISTORY)
-------------------------------------------------- */

const Dashboard = {
    load: function () {
        const user = app.getUser();
        if (!user) return;

        document.getElementById("userName").innerText = user.name;

        let history = JSON.parse(localStorage.getItem("history") || "[]");

        let list = "";
        history.forEach(h => {
            list += `<li>${h.type} — ${h.detail} — ${h.date}</li>`;
        });

        document.getElementById("historyList").innerHTML = list || "No history yet.";
    }
};


/* --------------------------------------------------
   PAGE ROUTER
-------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    await app.loadData();

    const page = document.body.dataset.page;

    if (page === "vocab") VocabUI.init(app.data.vocab);
    if (page === "fill") FillUI.init(app.data.fill);
    if (page === "dashboard") Dashboard.load();

    // Signup
    const signupBtn = document.getElementById("signupBtn");
    if (signupBtn) {
        signupBtn.onclick = () => {
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const pass = document.getElementById("pass").value;

            const ok = Auth.signup(name, email, pass);
            if (ok.ok) window.location.href = "dashboard.html";
            else alert(ok.msg);
        };
    }

    // Login
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.onclick = () => {
            const email = document.getElementById("email").value;
            const pass = document.getElementById("pass").value;

            const ok = Auth.login(email, pass);
            if (ok.ok) window.location.href = "dashboard.html";
            else alert(ok.msg);
        };
    }
});
