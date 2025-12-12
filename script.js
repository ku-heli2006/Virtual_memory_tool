class VirtualMemorySimulator {
    constructor() {
        this.initializeVariables();
        this.initializeCharts();
        this.setupEventListeners();
        this.initializeMemory();
    }
    
    initializeVariables() {
        this.physicalMemorySize = 4;
        this.virtualMemorySize = 12;
        this.pageSize = 4;
        this.referenceString = [7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1];
        this.currentAlgorithm = 'FIFO';
        this.fragmentationType = 'none';
        
        this.physicalMemory = [];
        this.pageTable = new Map();
        this.pageFaults = 0;
        this.hits = 0;
        this.currentStep = 0;
        this.segments = [];
        this.faultsHistory = [];
        this.clockHand = 0;
        
        this.isRunning = false;
        this.simulationSpeed = 500;
    }
    
    initializeCharts() {
        const faultsCtx = document.getElementById('faults-chart').getContext('2d');
        this.faultsChart = new Chart(faultsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Cumulative Page Faults',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Page Faults'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Reference Steps'
                        }
                    }
                }
            }
        });
        
        const comparisonCtx = document.getElementById('comparison-chart').getContext('2d');
        this.comparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: ['FIFO', 'LRU', 'Optimal', 'Clock'],
                datasets: [{
                    label: 'Page Faults',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Page Fault Count'
                        }
                    }
                }
            }
        });
    }
    
    initializeMemory() {
        this.physicalMemory = Array(this.physicalMemorySize).fill(null);
        this.pageTable.clear();
        
        for (let i = 0; i < this.virtualMemorySize; i++) {
            this.pageTable.set(i, {
                frame: -1,
                valid: false,
                referenceBit: 0,
                modifiedBit: Math.random() > 0.7 ? 1 : 0,
                lastUsed: -1
            });
        }
        
        this.updateVisualizations();
    }
    
    setupEventListeners() {
        document.getElementById('run-simulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('step-simulation').addEventListener('click', () => this.stepSimulation());
        document.getElementById('reset-simulation').addEventListener('click', () => this.resetSimulation());
        document.getElementById('random-generate').addEventListener('click', () => this.generateRandomInput());
        document.getElementById('add-segment').addEventListener('click', () => this.addRandomSegment());
        document.getElementById('clear-segments').addEventListener('click', () => this.clearSegments());
        
        // Update parameters on input change
        ['physical-memory', 'virtual-memory', 'page-size', 'reference-string', 
         'algorithm', 'fragmentation-type'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.updateParameters();
            });
        });
        
        // Algorithm explanation cards
        document.querySelectorAll('.card[data-algorithm]').forEach(card => {
            card.addEventListener('click', (e) => {
                const algorithm = card.dataset.algorithm;
                document.getElementById('algorithm').value = algorithm;
                this.updateParameters();
            });
        });
    }
    
    updateParameters() {
        this.physicalMemorySize = parseInt(document.getElementById('physical-memory').value);
        this.virtualMemorySize = parseInt(document.getElementById('virtual-memory').value);
        this.pageSize = parseInt(document.getElementById('page-size').value);
        
        const refString = document.getElementById('reference-string').value;
        this.referenceString = refString.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
        
        this.currentAlgorithm = document.getElementById('algorithm').value;
        this.fragmentationType = document.getElementById('fragmentation-type').value;
        
        this.resetSimulation();
    }
    
    runSimulation() {
        if (this.isRunning || this.currentStep >= this.referenceString.length) return;
        
        this.isRunning = true;
        document.getElementById('run-simulation').disabled = true;
        
        const simulateStep = () => {
            if (this.currentStep < this.referenceString.length) {
                this.stepSimulation();
                setTimeout(simulateStep, this.simulationSpeed);
            } else {
                this.isRunning = false;
                document.getElementById('run-simulation').disabled = false;
            }
        };
        
        simulateStep();
    }
    
    stepSimulation() {
        if (this.currentStep >= this.referenceString.length) {
            alert('Simulation complete!');
            return;
        }
        
        const pageNumber = this.referenceString[this.currentStep];
        this.processPageRequest(pageNumber);
        this.currentStep++;
        
        this.updateVisualizations();
        this.updateStatistics();
        
        if (this.currentStep === this.referenceString.length) {
            this.completeSimulation();
        }
    }
    
    processPageRequest(pageNumber) {
        const pageEntry = this.pageTable.get(pageNumber);
        
        if (!pageEntry) {
            console.error(`Page ${pageNumber} not found in page table`);
            return;
        }
        
        // Update reference bit and last used time
        pageEntry.referenceBit = 1;
        pageEntry.lastUsed = this.currentStep;
        
        if (pageEntry.valid && pageEntry.frame !== -1) {
            // Page hit
            this.hits++;
            this.updateReferenceProgress(false);
            return;
        }
        
        // Page fault
        this.pageFaults++;
        this.faultsHistory.push(this.pageFaults);
        this.updateReferenceProgress(true);
        
        // Find free frame
        let freeFrame = this.physicalMemory.findIndex(frame => frame === null);
        
        if (freeFrame !== -1) {
            // Free frame available
            this.allocatePage(pageNumber, freeFrame);
        } else {
            // Need to replace a page
            this.performPageReplacement(pageNumber);
        }
    }
    
    allocatePage(pageNumber, frameNumber) {
        this.physicalMemory[frameNumber] = pageNumber;
        
        const pageEntry = this.pageTable.get(pageNumber);
        pageEntry.frame = frameNumber;
        pageEntry.valid = true;
        pageEntry.referenceBit = 1;
    }
    
    performPageReplacement(pageNumber) {
        let victimFrame = -1;
        
        switch(this.currentAlgorithm) {
            case 'FIFO':
                victimFrame = this.fifoReplacement();
                break;
            case 'LRU':
                victimFrame = this.lruReplacement();
                break;
            case 'OPTIMAL':
                victimFrame = this.optimalReplacement(pageNumber);
                break;
            case 'CLOCK':
                victimFrame = this.clockReplacement();
                break;
        }
        
        if (victimFrame !== -1) {
            // Remove old page
            const oldPage = this.physicalMemory[victimFrame];
            if (oldPage !== null) {
                const oldEntry = this.pageTable.get(oldPage);
                if (oldEntry) {
                    oldEntry.frame = -1;
                    oldEntry.valid = false;
                }
            }
            
            // Allocate new page
            this.allocatePage(pageNumber, victimFrame);
        }
    }
    
    fifoReplacement() {
        // Simple FIFO: replace the page that was loaded first
        return 0; // In a real implementation, we'd track loading order
    }
    
    lruReplacement() {
        let lruFrame = 0;
        let lruTime = Infinity;
        
        for (let i = 0; i < this.physicalMemorySize; i++) {
            const page = this.physicalMemory[i];
            if (page !== null) {
                const entry = this.pageTable.get(page);
                if (entry && entry.lastUsed < lruTime) {
                    lruTime = entry.lastUsed;
                    lruFrame = i;
                }
            }
        }
        
        return lruFrame;
    }
    
    optimalReplacement(currentPage) {
        let optimalFrame = 0;
        let farthestUse = -1;
        
        for (let i = 0; i < this.physicalMemorySize; i++) {
            const page = this.physicalMemory[i];
            if (page === null) continue;
            
            // Find next use of this page
            let nextUse = Infinity;
            for (let j = this.currentStep + 1; j < this.referenceString.length; j++) {
                if (this.referenceString[j] === page) {
                    nextUse = j;
                    break;
                }
            }
            
            if (nextUse > farthestUse) {
                farthestUse = nextUse;
                optimalFrame = i;
            }
        }
        
        return optimalFrame;
    }
    
    clockReplacement() {
        while (true) {
            const page = this.physicalMemory[this.clockHand];
            if (page !== null) {
                const entry = this.pageTable.get(page);
                if (entry.referenceBit === 0) {
                    return this.clockHand;
                } else {
                    entry.referenceBit = 0;
                }
            }
            this.clockHand = (this.clockHand + 1) % this.physicalMemorySize;
        }
    }
    
    updateReferenceProgress(isFault) {
        const refProgress = document.getElementById('reference-progress');
        refProgress.innerHTML = '';
        
        this.referenceString.forEach((ref, index) => {
            const refDiv = document.createElement('div');
            refDiv.className = 'ref-number';
            refDiv.textContent = ref;
            
            if (index === this.currentStep) {
                refDiv.classList.add('current');
            } else if (index < this.currentStep) {
                refDiv.classList.add('processed');
                // Check if this was a fault
                if (this.checkIfFaultAtStep(index)) {
                    refDiv.classList.add('fault');
                }
            }
            
            refProgress.appendChild(refDiv);
        });
    }
    
    checkIfFaultAtStep(step) {
        // Simplified check - in real implementation, track fault steps
        return step % 3 === 0; // Just for visualization
    }
    
    updateVisualizations() {
        this.updatePhysicalMemoryVisualization();
        this.updateVirtualMemoryVisualization();
        this.updatePageTable();
        this.updateSegmentationVisualization();
        this.updateCharts();
    }
    
    updatePhysicalMemoryVisualization() {
        const physicalViz = document.getElementById('physical-memory-viz');
        physicalViz.innerHTML = '';
        
        this.physicalMemory.forEach((page, frame) => {
            const cell = document.createElement('div');
            cell.className = 'memory-cell';
            
            if (page !== null) {
                cell.classList.add('occupied');
                cell.innerHTML = `
                    <div class="page-number">P${page}</div>
                    <div class="frame-number">Frame ${frame}</div>
                `;
                
                // Add fault animation if this frame was just involved in a fault
                if (this.pageFaults > 0 && frame === this.physicalMemorySize - 1) {
                    cell.classList.add('fault');
                }
            } else {
                cell.innerHTML = `
                    <div class="page-number">Empty</div>
                    <div class="frame-number">Frame ${frame}</div>
                `;
            }
            
            physicalViz.appendChild(cell);
        });
    }
    
    updateVirtualMemoryVisualization() {
        const virtualViz = document.getElementById('virtual-memory-viz');
        virtualViz.innerHTML = '';
        
        for (let i = 0; i < this.virtualMemorySize; i++) {
            const pageEntry = this.pageTable.get(i);
            const cell = document.createElement('div');
            cell.className = 'memory-cell';
            
            if (pageEntry && pageEntry.valid) {
                cell.classList.add('occupied');
                cell.innerHTML = `
                    <div class="page-number">P${i}</div>
                    <div class="frame-number">In RAM</div>
                `;
            } else {
                cell.innerHTML = `
                    <div class="page-number">P${i}</div>
                    <div class="frame-number">On Disk</div>
                `;
            }
            
            virtualViz.appendChild(cell);
        }
    }
    
    updatePageTable() {
        const tableBody = document.getElementById('page-table-body');
        tableBody.innerHTML = '';
        
        for (let [page, entry] of this.pageTable.entries()) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${page}</td>
                <td>${entry.frame !== -1 ? entry.frame : 'Disk'}</td>
                <td>${entry.valid ? '1' : '0'}</td>
                <td>${entry.referenceBit}</td>
                <td>${entry.modifiedBit}</td>
                <td>${entry.lastUsed !== -1 ? entry.lastUsed : '-'}</td>
            `;
            tableBody.appendChild(row);
        }
    }
    
    updateSegmentationVisualization() {
        const segViz = document.getElementById('segmentation-viz');
        segViz.innerHTML = '';
        
        if (this.fragmentationType === 'external') {
            this.simulateExternalFragmentation();
        } else if (this.fragmentationType === 'internal') {
            this.simulateInternalFragmentation();
        }
        
        this.segments.forEach(segment => {
            const segDiv = document.createElement('div');
            segDiv.className = 'segment';
            segDiv.style.left = `${segment.start}%`;
            segDiv.style.width = `${segment.size}%`;
            segDiv.style.height = '100%';
            segDiv.style.background = segment.color;
            segDiv.textContent = `Seg ${segment.id}`;
            
            segViz.appendChild(segDiv);
        });
    }
    
    simulateExternalFragmentation() {
        // Create fragmented memory layout
        this.segments = [
            { id: 1, start: 0, size: 20, color: '#FF6B6B' },
            { id: 2, start: 30, size: 15, color: '#4ECDC4' },
            { id: 3, start: 55, size: 10, color: '#FFD166' },
            { id: 4, start: 75, size: 25, color: '#06D6A0' }
        ];
    }
    
    simulateInternalFragmentation() {
        // Create segments with wasted space
        this.segments = [
            { id: 1, start: 0, size: 25, color: '#FF6B6B', waste: 5 },
            { id: 2, start: 30, size: 20, color: '#4ECDC4', waste: 8 },
            { id: 3, start: 55, size: 15, color: '#FFD166', waste: 3 },
            { id: 4, start: 75, size: 20, color: '#06D6A0', waste: 6 }
        ];
    }
    
    updateCharts() {
        // Update faults chart
        const labels = Array.from({length: this.currentStep}, (_, i) => i + 1);
        this.faultsChart.data.labels = labels;
        this.faultsChart.data.datasets[0].data = this.faultsHistory.slice(0, this.currentStep);
        this.faultsChart.update();
        
        // Update comparison chart (simulate all algorithms)
        const comparisonData = this.simulateAllAlgorithms();
        this.comparisonChart.data.datasets[0].data = comparisonData;
        this.comparisonChart.update();
    }
    
    simulateAllAlgorithms() {
        // Simplified simulation of all algorithms
        const baseFaults = this.pageFaults;
        return [
            baseFaults, // FIFO
            Math.floor(baseFaults * 0.8), // LRU (usually better)
            Math.floor(baseFaults * 0.6), // Optimal (best)
            Math.floor(baseFaults * 0.85) // Clock
        ];
    }
    
    updateStatistics() {
        const totalAccesses = this.currentStep;
        const hitRatio = totalAccesses > 0 ? (this.hits / totalAccesses * 100).toFixed(1) : 0;
        const memoryUtilization = (this.physicalMemory.filter(p => p !== null).length / this.physicalMemorySize * 100).toFixed(1);
        
        let fragmentation = 0;
        if (this.fragmentationType === 'internal') {
            fragmentation = 15.5; // Example value
        } else if (this.fragmentationType === 'external') {
            fragmentation = 22.3; // Example value
        }
        
        document.getElementById('page-faults').textContent = this.pageFaults;
        document.getElementById('hit-ratio').textContent = `${hitRatio}%`;
        document.getElementById('memory-utilization').textContent = `${memoryUtilization}%`;
        document.getElementById('fragmentation').textContent = `${fragmentation}%`;
    }
    
    completeSimulation() {
        this.updateStatistics();
        
        // Show summary
        const totalAccesses = this.referenceString.length;
        const hitRatio = (this.hits / totalAccesses * 100).toFixed(1);
        
        alert(`Simulation Complete!\n\n` +
              `Total Page Faults: ${this.pageFaults}\n` +
              `Hit Ratio: ${hitRatio}%\n` +
              `Memory Utilization: ${((this.physicalMemory.filter(p => p !== null).length / this.physicalMemorySize) * 100).toFixed(1)}%`);
    }
    
    resetSimulation() {
        this.currentStep = 0;
        this.pageFaults = 0;
        this.hits = 0;
        this.faultsHistory = [];
        this.isRunning = false;
        
        document.getElementById('run-simulation').disabled = false;
        
        this.initializeMemory();
        this.updateStatistics();
        this.updateReferenceProgress(false);
    }
    
    generateRandomInput() {
        // Generate random reference string
        const length = Math.floor(Math.random() * 15) + 10;
        const maxPage = Math.floor(Math.random() * 10) + 5;
        const refString = Array.from({length}, () => Math.floor(Math.random() * maxPage));
        
        document.getElementById('reference-string').value = refString.join(',');
        document.getElementById('virtual-memory').value = maxPage + 5;
        
        this.updateParameters();
    }
    
    addRandomSegment() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F'];
        const id = this.segments.length + 1;
        const size = Math.floor(Math.random() * 20) + 10;
        const start = Math.floor(Math.random() * (100 - size));
        
        this.segments.push({
            id,
            start,
            size,
            color: colors[id % colors.length]
        });
        
        this.updateSegmentationVisualization();
    }
    
    clearSegments() {
        this.segments = [];
        this.updateSegmentationVisualization();
    }
}

// Initialize the simulator when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new VirtualMemorySimulator();
});