import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = 'G-BKTFZRLZYM'; // User provided (Final)

export const initGA = () => {
    // Initialize only once
    if (!window.GA_INITIALIZED) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
        window.GA_INITIALIZED = true;
    }
};

export const logPageView = () => {
    ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
};

export const logEvent = (category, action, label) => {
    if (window.GA_INITIALIZED) {
        ReactGA.event({
            category: category,
            action: action,
            label: label,
        });
    }
};
