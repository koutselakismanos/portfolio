// src/data/projects.js
export const projectsData = [
    // Software Projects
    {
        id: 'midimacro-site',
        title: 'Midimacro.com',
        shortDescription: 'MIDI software routing and hotkey software.',
        startDate: '2025-02',
        endDate: 'Present',
        images: [
            { src: '/images/projects/midimacro.png', alt: 'Midimacro.com project screenshot' }
        ],
        techPills: ['Electron', 'Astro', 'React'],
        link: 'https://midimacro.com'
        // No pcbModelPath
    },
    {
        id: 'fretvisualizer-site',
        title: 'FretVisualizer.com',
        shortDescription: 'Visualize your fretted instrument.',
        startDate: '2025-02',
        endDate: 'Present',
        images: [
            { src: '/images/projects/fretvisualizer.png', alt: 'FretVisualizer.com project screenshot' }
        ],
        techPills: ['Astro', 'React'],
        link: 'https://fretvisualizer.com'
        // No pcbModelPath
    },
    {
        id: 'footcontroller-x6',
        title: 'FootController_X6',
        shortDescription: 'Customizable 6-switch USB MIDI footswitch controller.',
        startDate: '2024-12',
        // endDate: 'YYYY-MM',
        // images: [
        //     { src: '/images/placeholders/pcb-project.png', blurSrc: '/images/placeholders/pcb-project-blur.png', alt: 'FootController X6 placeholder image' }
        // ],
        techPills: ['ESP32', 'MIDI', 'PCB Design'],
        link: 'https://github.com/koutselakismanos/FootController_X6',
        pcbModelPath: '/assets/models/FootController_X6.glb' // From original data
    },
    {
        id: 'quadmix-preamp',
        title: 'QuadMix Preamp',
        shortDescription: 'QuadMix Preamp is a 4-channel mixer preamp.',
        startDate: '2025-01',
        endDate: 'Present',
        // images: [
        //     { src: '/images/placeholders/pcb-project.png', blurSrc: '/images/placeholders/pcb-project-blur.png', alt: 'PickupMixer placeholder image' }
        // ],
        techPills: ['Audio Electronics', 'PCB Design'],
        pcbModelPath: '/assets/models/PickupMixer.glb'
    }
];