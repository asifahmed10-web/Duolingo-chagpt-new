Promise.race([
    fetch("/vocab.json").then(r => r.json()),
    new Promise((_, reject) => setTimeout(() => reject("timeout"), 5000))
])
.then(data => startGame(data))
.catch(err => {
    document.getElementById("wordBox").innerHTML = "Failed to load data";
});
