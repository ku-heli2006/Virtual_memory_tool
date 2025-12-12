// This file contains detailed implementations of page replacement algorithms

class PageReplacementAlgorithms {
    static fifo(referenceString, frameCount) {
        const frames = [];
        const queue = [];
        let faults = 0;
        const results = [];
        
        for (let ref of referenceString) {
            if (!frames.includes(ref)) {
                faults++;
                if (frames.length < frameCount) {
                    frames.push(ref);
                    queue.push(ref);
                } else {
                    const victim = queue.shift();
                    const index = frames.indexOf(victim);
                    frames[index] = ref;
                    queue.push(ref);
                }
                results.push({ page: ref, fault: true, frames: [...frames] });
            } else {
                results.push({ page: ref, fault: false, frames: [...frames] });
            }
        }
        
        return { faults, results };
    }
    
    static lru(referenceString, frameCount) {
        const frames = [];
        const lastUsed = new Map();
        let time = 0;
        let faults = 0;
        const results = [];
        
        for (let ref of referenceString) {
            time++;
            
            if (!frames.includes(ref)) {
                faults++;
                if (frames.length < frameCount) {
                    frames.push(ref);
                } else {
                    // Find LRU page
                    let lruPage = frames[0];
                    let lruTime = lastUsed.get(lruPage) || Infinity;
                    
                    for (let page of frames.slice(1)) {
                        const pageTime = lastUsed.get(page) || Infinity;
                        if (pageTime < lruTime) {
                            lruPage = page;
                            lruTime = pageTime;
                        }
                    }
                    
                    // Replace LRU page
                    const index = frames.indexOf(lruPage);
                    frames[index] = ref;
                }
                results.push({ page: ref, fault: true, frames: [...frames] });
            } else {
                results.push({ page: ref, fault: false, frames: [...frames] });
            }
            
            lastUsed.set(ref, time);
        }
        
        return { faults, results };
    }
    
    static optimal(referenceString, frameCount) {
        const frames = [];
        let faults = 0;
        const results = [];
        
        for (let i = 0; i < referenceString.length; i++) {
            const ref = referenceString[i];
            
            if (!frames.includes(ref)) {
                faults++;
                if (frames.length < frameCount) {
                    frames.push(ref);
                } else {
                    // Find optimal page to replace
                    let farthestIndex = -1;
                    let replaceIndex = -1;
                    
                    for (let j = 0; j < frames.length; j++) {
                        const page = frames[j];
                        let nextUse = Infinity;
                        
                        // Find next use of this page
                        for (let k = i + 1; k < referenceString.length; k++) {
                            if (referenceString[k] === page) {
                                nextUse = k;
                                break;
                            }
                        }
                        
                        if (nextUse > farthestIndex) {
                            farthestIndex = nextUse;
                            replaceIndex = j;
                        }
                    }
                    
                    // Replace the page that won't be used for the longest time
                    frames[replaceIndex] = ref;
                }
                results.push({ page: ref, fault: true, frames: [...frames] });
            } else {
                results.push({ page: ref, fault: false, frames: [...frames] });
            }
        }
        
        return { faults, results };
    }
    
    static clock(referenceString, frameCount) {
        const frames = Array(frameCount).fill(null);
        const referenceBits = Array(frameCount).fill(0);
        let pointer = 0;
        let faults = 0;
        const results = [];
        
        for (let ref of referenceString) {
            let found = false;
            
            // Check if page is already in memory
            for (let i = 0; i < frameCount; i++) {
                if (frames[i] === ref) {
                    referenceBits[i] = 1;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                faults++;
                // Find page to replace using clock algorithm
                while (true) {
                    if (frames[pointer] === null) {
                        // Empty frame found
                        frames[pointer] = ref;
                        referenceBits[pointer] = 1;
                        pointer = (pointer + 1) % frameCount;
                        break;
                    } else if (referenceBits[pointer] === 0) {
                        // Found page with reference bit 0
                        frames[pointer] = ref;
                        referenceBits[pointer] = 1;
                        pointer = (pointer + 1) % frameCount;
                        break;
                    } else {
                        // Give second chance
                        referenceBits[pointer] = 0;
                        pointer = (pointer + 1) % frameCount;
                    }
                }
                results.push({ page: ref, fault: true, frames: [...frames] });
            } else {
                results.push({ page: ref, fault: false, frames: [...frames] });
            }
        }
        
        return { faults, results };
    }
    
    static compareAlgorithms(referenceString, frameCount) {
        const algorithms = {
            'FIFO': this.fifo(referenceString, frameCount).faults,
            'LRU': this.lru(referenceString, frameCount).faults,
            'Optimal': this.optimal(referenceString, frameCount).faults,
            'Clock': this.clock(referenceString, frameCount).faults
        };
        
        return algorithms;
    }
    
    static generateReferenceString(length, maxPage, pattern = 'random') {
        let refString = [];
        
        switch(pattern) {
            case 'random':
                refString = Array.from({length}, () => Math.floor(Math.random() * maxPage));
                break;
            case 'locality':
                // Generate string with locality of reference
                let current = Math.floor(Math.random() * maxPage);
                for (let i = 0; i < length; i++) {
                    if (Math.random() < 0.7) {
                        // Stay close to current page
                        current = Math.max(0, Math.min(maxPage - 1, 
                            current + Math.floor(Math.random() * 3) - 1));
                    } else {
                        // Random jump
                        current = Math.floor(Math.random() * maxPage);
                    }
                    refString.push(current);
                }
                break;
            case 'sequential':
                for (let i = 0; i < length; i++) {
                    refString.push(i % maxPage);
                }
                break;
        }
        
        return refString;
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageReplacementAlgorithms;
}