// src/data/projects.js
export const projectsData = [
    {
        id: 'project-1',
        title: 'Smart Environmental Monitor',
        date: 'Jan 2024 - Present',
        description: 'An advanced IoT device tracking air quality (PM2.5, VOCs), temperature, and humidity, transmitting data via MQTT to a cloud backend for real-time dashboarding and anomaly detection alerts.',
        imageBlurSrc: '/images/placeholder-blur.png', // Placeholder
        imageSrc: '/images/smart-env-monitor.png', // Placeholder
        link: '#', // Placeholder or actual link
        techPills: ['ESP32', 'Custom PCB', 'MQTT', 'Python (FastAPI)', 'InfluxDB', 'Grafana']
    },
    {
        id: 'project-2',
        title: 'Low-Power LoRaWAN Asset Tracker',
        date: 'Side Project - 2023',
        description: 'Designed and built a battery-powered asset tracker using LoRaWAN for long-range communication, focusing on ultra-low power consumption for multi-year battery life. Includes GPS and accelerometer.',
        imageBlurSrc: '/images/placeholder-blur.png', // Placeholder
        imageSrc: '/images/asset-tracker-pcb.png', // Placeholder
        link: '#', // Placeholder or actual link
        techPills: ['STM32L0', 'LoRaWAN', 'GPS', 'C (Firmware)', 'Power Management']
    },
    {
        id: 'project-3',
        title: 'Open Source Home Automation Hub',
        date: 'Ongoing Contribution',
        description: 'Contributing to an open-source home automation platform by developing new device integrations (Zigbee/Z-Wave via MQTT) and enhancing the core API for better extensibility.',
        imageBlurSrc: '/images/placeholder-blur.png', // Placeholder
        imageSrc: '/images/home-automation-ui.png', // Placeholder
        link: '#', // Placeholder or actual link
        techPills: ['Python', 'Docker', 'Node.js', 'Vue.js', 'API Design']
    }
];