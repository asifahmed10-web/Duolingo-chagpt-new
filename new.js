async function loadWords() {
    const response = await fetch("/vocab.json");
    const data = await response.json();

    // random 20 words only
    return data.sort(() => Math.random() - 0.5).slice(0, 20);
}

