export const formStateMiddleware = (req, res, next) => {
    if (req.session.formState) {
        res.locals.error = req.session.formState.error || res.locals.error || null;
        res.locals.success = req.session.formState.success || res.locals.success || null;
        res.locals.fieldErrors = req.session.formState.fieldErrors || null;
        res.locals.formData = req.session.formState.formData || null;
        
        delete req.session.formState;
    }

    res.redirectWithState = function(url, state = {}) {
        const sensitiveFields = [
            'password', 'confirmPassword', 'newPassword', 'oldPassword',
            'otp', 'otp1', 'otp2', 'otp3', 'otp4', 'otp5', 'otp6',
            'cvv', 'securityCode', 'cardNumber'
        ];

        let formData = state.formData || (req.body ? { ...req.body } : {});
        sensitiveFields.forEach(field => {
            delete formData[field];
        });

        let error = state.error;
        if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
            const firstErrorKey = Object.keys(state.fieldErrors)[0];
            error = state.fieldErrors[firstErrorKey];
        }

        req.session.formState = {
            error: error || null,
            success: state.success || null,
            fieldErrors: state.fieldErrors || null,
            formData: formData
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save error during PRG redirect:', err);
            }
            res.redirect(url);
        });
    };

    next();
};
