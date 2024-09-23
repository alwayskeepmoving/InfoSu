self.onmessage = function(event) {
    const { frequency, magnitude, frequencyBands, totalBars } = event.data;
    const bandData = frequencyBands.map((band, bandIndex) => {
        const numBarsInBand = Math.round(totalBars * band.widthRatio);
        const bandMagnitudes = calculateBandMagnitudes(frequency, magnitude, band.start, band.end, numBarsInBand);
        return { bandMagnitudes, numBarsInBand, amplitudeScale: band.amplitudeScale, maxAmplitude: band.maxAmplitude };
    });
    self.postMessage(bandData);
};

// 计算每个频段的振幅
function calculateBandMagnitudes(frequency, magnitude, start, end, numBars) {
    const step = (end - start) / numBars;
    const bandMagnitudes = Array(numBars).fill(0);

    for (let i = 0; i < numBars; i++) {
        const currentFreq = start + i * step + step / 2;
        const closestIndex = frequency.findIndex(f => f >= currentFreq);
        bandMagnitudes[i] = closestIndex !== -1 ? magnitude[closestIndex] : 0;
    }
    return bandMagnitudes;
}
