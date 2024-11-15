import express from 'express';
import dotenv from 'dotenv';
import User from '../models/User.js'; // N'oubliez pas d'ajouter l'extension .js
import twilio from 'twilio';
dotenv.config();


const router = express.Router();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Route pour l'inscription
router.post('/register', async (req, res) => {
    const { email, password, phone } = req.body;
    try {
        const newUser = new User({ email, password, phone });
        await newUser.save();
        res.json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Route pour l'authentification
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Vérifier si un OTP existe et s'il est encore valide
        const currentTime = new Date();
        if (user.otp && user.otpExpiresAt > currentTime) {
            return res.json({ success: true, message: 'OTP already sent and is still valid.' });
        }

        //le code générera un nouvel OTP et définir une expiration de 30 minutes
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiresAt = new Date(currentTime.getTime() + 30 * 60000); // 30 minutes

        // Mettre à jour l'OTP et l'expiration dans la base de données
        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        // Envoyer le nouvel OTP par SMS
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
        });

        res.json({ success: true, message: 'OTP sent to your phone.', otp });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;