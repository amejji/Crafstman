
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rénovation Guide - Votre accompagnement travaux immobilier</title>
    <style>
        :root {
            --primary: #2c3e50;
            --secondary: #3498db;
            --accent: #e74c3c;
            --light: #ecf0f1;
            --dark: #2c3e50;
            --success: #2ecc71;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f9f9f9;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            width: 90%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 15px;
        }
        
        /* Header */
        header {
            background-color: white;
            box-shadow: var(--shadow);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
            text-decoration: none;
            display: flex;
            align-items: center;
        }
        
        .logo span {
            color: var(--secondary);
        }
        
        nav ul {
            display: flex;
            list-style: none;
        }
        
        nav ul li {
            margin-left: 25px;
        }
        
        nav ul li a {
            text-decoration: none;
            color: var(--dark);
            font-weight: 500;
            transition: var(--transition);
        }
        
        nav ul li a:hover {
            color: var(--secondary);
        }
        
        .btn {
            display: inline-block;
            background: var(--secondary);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 500;
            transition: var(--transition);
            border: none;
            cursor: pointer;
        }
        
        .btn:hover {
            background: var(--primary);
            transform: translateY(-2px);
        }
        
        .btn-accent {
            background: var(--accent);
        }
        
        .btn-accent:hover {
            background: #c0392b;
        }
        
        /* Hero Section */
        .hero {
            background: linear-gradient(rgba(44, 62, 80, 0.8), rgba(44, 62, 80, 0.8)), url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%232c3e50"/></svg>');
            background-size: cover;
            color: white;
            padding: 80px 0;
            text-align: center;
        }
        
        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        
        .hero p {
            font-size: 1.2rem;
            max-width: 700px;
            margin: 0 auto 30px;
        }
        
        /* Features */
        .features {
            padding: 80px 0;
            background: white;
        }
        
        .section-title {
            text-align: center;
            margin-bottom: 50px;
            color: var(--primary);
        }
        
        .section-title h2 {
            font-size: 2rem;
            margin-bottom: 15px;
        }
        
        .section-title p {
            color: #777;
            max-width: 700px;
            margin: 0 auto;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .feature-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: var(--transition);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .feature-icon {
            background: var(--secondary);
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
        }
        
        .feature-content {
            padding: 20px;
        }
        
        .feature-content h3 {
            margin-bottom: 15px;
            color: var(--primary);
        }
        
        /* Calculator Section */
        .calculator {
            padding: 80px 0;
            background: var(--light);
        }
        
        .calculator-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            align-items: start;
        }
        
        @media (max-width: 768px) {
            .calculator-container {
                grid-template-columns: 1fr;
            }
        }
        
        .calc-form {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: var(--shadow);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--dark);
        }
        
        .form-group select, 
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        
        .form-group select:focus, 
        .form-group input:focus {
            outline: none;
            border-color: var(--secondary);
        }
        
        .results {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            position: sticky;
            top: 100px;
        }
        
        .results h3 {
            margin-bottom: 20px;
            color: var(--primary);
            text-align: center;
        }
        
        .result-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .total {
            font-weight: 700;
            font-size: 1.2rem;
            color: var(--primary);
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid var(--secondary);
        }
        
        /* Steps Section */
        .steps {
            padding: 80px 0;
            background: white;
        }
        
        .steps-container {
            display: flex;
            flex-direction: column;
            gap: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            gap: 20px;
        }
        
        .step-number {
            background: var(--secondary);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            flex-shrink: 0;
        }
        
        .step-content h3 {
            margin-bottom: 10px;
            color: var(--primary);
        }
        
        /* Contact */
        .contact {
            padding: 80px 0;
            background: var(--light);
        }
        
        .contact-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        @media (max-width: 768px) {
            .contact-container {
                grid-template-columns: 1fr;
            }
        }
        
        .contact-info {
            background: var(--primary);
            color: white;
            padding: 30px;
            border-radius: 8px;
        }
        
        .contact-info h3 {
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .contact-info p {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .contact-form {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: var(--shadow);
        }
        
        /* Footer */
        footer {
            background: var(--dark);
            color: white;
            padding: 40px 0 20px;
        }
        
        .footer-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .footer-col h4 {
            font-size: 1.2rem;
            margin-bottom: 20px;
            position: relative;
            padding-bottom: 10px;
        }
        
        .footer-col h4::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: 0;
            width: 50px;
            height: 2px;
            background: var(--secondary);
        }
        
        .footer-col ul {
            list-style: none;
        }
        
        .footer-col ul li {
            margin-bottom: 10px;
        }
        
        .footer-col ul li a {
            color: #ccc;
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer-col ul li a:hover {
            color: white;
            padding-left: 5px;
        }
        
        .copyright {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.9rem;
            color: #ccc;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: white;
            width: 90%;
            max-width: 500px;
            border-radius: 8px;
            padding: 30px;
            position: relative;
        }
        
        .close-modal {
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
            color: #777;
        }
        
        /* Progress Bar */
        .progress-container {
            width: 100%;
            background: #eee;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .progress-bar {
            height: 10px;
            background: var(--secondary);
            border-radius: 5px;
            width: 0%;
            transition: width 0.5s ease;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="container header-container">
            <a href="#" class="logo">Rénovation<span>Guide</span></a>
            <nav>
                <ul>
                    <li><a href="#accueil">Accueil</a></li>
                    <li><a href="#simulateur">Simulateur</a></li>
                    <li><a href="#accompagnement">Accompagnement</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </nav>
            <a href="#simulateur" class="btn">Estimer mon projet</a>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero" id="accueil">
        <div class="container">
            <h1>Votre projet immobilier, maîtrisé de A à Z</h1>
            <p>Estimez le coût de vos travaux et bénéficiez d'un accompagnement personnalisé jusqu'à la fin de votre projet.</p>
            <a href="#simulateur" class="btn">Commencer l'estimation</a>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <div class="section-title">
                <h2>Notre accompagnement complet</h2>
                <p>De l'estimation initiale à la réception des travaux, nous vous guidons à chaque étape</p>
            </div>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <div class="feature-content">
                        <h3>Estimation précise</h3>
                        <p>Obtenez une estimation détaillée du coût de vos travaux par corps de métier.</p>
                    </div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <div class="feature-content">
                        <h3>Planning personnalisé</h3>
                        <p>Établissez un calendrier réaliste pour votre projet de rénovation.</p>
                    </div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">👨‍💼</div>
                    <div class="feature-content">
                        <h3>Artisans qualifiés</h3>
                        <p>Bénéficiez de notre réseau d'artisans vérifiés et recommandés.</p>
                    </div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💰</div>
                    <div class="feature-content">
                        <h3>Optimisation budget</h3>
                        <p>Recevez des conseils pour optimiser votre budget sans sacrifier la qualité.</p>
                    </div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📋</div>
                    <div class="feature-content">
                        <h3>Suivi des travaux</h3>
                        <p>Suivez l'avancement de votre projet et maîtrisez les délais.</p>
                    </div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">✅</div>
                    <div class="feature-content">
                        <h3>Garanties incluses</h3>
                        <p>Bénéficiez de garanties de parfait achèvement sur tous les travaux.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Calculator Section -->
    <section class="calculator" id="simulateur">
        <div class="container">
            <div class="section-title">
                <h2>Simulateur de coûts de travaux</h2>
                <p>Estimez le budget nécessaire pour votre projet en quelques minutes</p>
            </div>
            <div class="calculator-container">
                <div class="calc-form">
                    <div class="form-group">
                        <label for="property-type">Type de bien</label>
                        <select id="property-type">
                            <option value="appartement">Appartement</option>
                            <option value="maison">Maison</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="surface">Surface (m²)</label>
                        <input type="number" id="surface" min="0" placeholder="Ex: 80">
                    </div>
                    <div class="form-group">
                        <label for="state">État du bien</label>
                        <select id="state">
                            <option value="ancien">À rénover complètement</option>
                            <option value="bon">Bon état, rafraîchissement</option>
                            <option value="neuf">Nécessite quelques aménagements</option>
                        </select>
                    </div>
                    
                    <h3>Corps d'état à inclure</h3>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="plomberie" checked> Plomberie
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="electricite" checked> Électricité
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="chauffage" checked> Chauffage
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="isolation" checked> Isolation
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="menuiserie" checked> Menuiserie (portes/fenêtres)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="platre" checked> Cloisons/Plâtrerie
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="carrelage" checked> Carrelage/Sol
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="peinture" checked> Peinture
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="cuisine" checked> Cuisine équipée
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="salle-de-bain" checked> Salle de bain
                        </label>
                    </div>
                    
                    <button class="btn" onclick="calculateCost()">Calculer l'estimation</button>
                </div>
                
                <div class="results">
                    <h3>Estimation des coûts</h3>
                    <div id="results-container">
                        <p>Sélectionnez vos options et cliquez sur "Calculer"</p>
                    </div>
                    <button class="btn btn-accent" onclick="showContactModal()">Recevoir mon devis détaillé</button>
                </div>
            </div>
        </div>
    </section>

    <!-- Steps Section -->
    <section class="steps" id="accompagnement">
        <div class="container">
            <div class="section-title">
                <h2>Notre accompagnement étape par étape</h2>
                <p>Un processus clair et transparent pour mener à bien votre projet</p>
            </div>
            <div class="steps-container">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>Évaluation du projet</h3>
                        <p>Analyse de vos besoins, estimation budgétaire précise et planning prévisionnel.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>Recherche d'artisans</h3>
                        <p>Sélection des professionnels qualifiés dans notre réseau et obtention de devis.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h3>Planification des travaux</h3>
                        <p>Coordination des intervenants et établissement d'un calendrier détaillé.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h3>Suivi du chantier</h3>
                        <p>Visites régulières, points d'avancement et résolution des éventuels problèmes.</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">5</div>
                    <div class="step-content">
                        <h3>Réception des travaux</h3>
                        <p>Vérification conforme des réalisations et gestion des garanties.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="contact" id="contact">
        <div class="container">
            <div class="section-title">
                <h2>Contactez-nous</h2>
                <p>Une question sur votre projet ? Notre équipe est à votre écoute</p>
            </div>
            <div class="contact-container">
                <div class="contact-info">
                    <h3>Nos coordonnées</h3>
                    <p>📞 01 23 45 67 89</p>
                    <p>✉️ contact@renovationguide.fr</p>
                    <p>🏢 123 Avenue des Rénovations, 75000 Paris</p>
                    <p>🕒 Lun-Ven: 9h-18h | Sam: 10h-16h</p>
                </div>
                <div class="contact-form">
                    <h3>Envoyez-nous un message</h3>
                    <div class="form-group">
                        <input type="text" placeholder="Votre nom">
                    </div>
                    <div class="form-group">
                        <input type="email" placeholder="Votre email">
                    </div>
                    <div class="form-group">
                        <input type="tel" placeholder="Votre téléphone">
                    </div>
                    <div class="form-group">
                        <textarea placeholder="Votre message" rows="5"></textarea>
                    </div>
                    <button class="btn">Envoyer le message</button>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-container">
                <div class="footer-col">
                    <h4>RénovationGuide</h4>
                    <ul>
                        <li><a href="#">À propos</a></li>
                        <li><a href="#">Notre équipe</a></li>
                        <li><a href="#">Nos valeurs</a></li>
                        <li><a href="#">Recrutement</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Services</h4>
                    <ul>
                        <li><a href="#">Estimation de travaux</a></li>
                        <li><a href="#">Accompagnement</a></li>
                        <li><a href="#">Réseau d'artisans</a></li>
                        <li><a href="#">Suivi de projet</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Ressources</h4>
                    <ul>
                        <li><a href="#">Guide de rénovation</a></li>
                        <li><a href="#">Blog conseils</a></li>
                        <li><a href="#">FAQ</a></li>
                        <li><a href="#">Témoignages</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Légal</h4>
                    <ul>
                        <li><a href="#">Conditions générales</a></li>
                        <li><a href="#">Politique de confidentialité</a></li>
                        <li><a href="#">Mentions légales</a></li>
                        <li><a href="#">Cookies</a></li>
                    </ul>
                </div>
            </div>
            <div class="copyright">
                <p>&copy; 2023 RénovationGuide - Tous droits réservés</p>
            </div>
        </div>
    </footer>

    <!-- Contact Modal -->
    <div class="modal" id="contact-modal">
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <h2>Recevez votre estimation détaillée</h2>
            <p>Renseignez vos coordonnées pour recevoir votre devis personnalisé par email.</p>
            <div class="form-group">
                <input type="text" placeholder="Votre nom">
            </div>
            <div class="form-group">
                <input type="email" placeholder="Votre email">
            </div>
            <div class="form-group">
                <input type="tel" placeholder="Votre téléphone">
            </div>
            <button class="btn">Envoyer la demande</button>
        </div>
    </div>

    <script>
        // Prix moyens au m² par corps d'état
        const prices = {
            plomberie: { low: 80, high: 150 },
            electricite: { low: 70, high: 120 },
            chauffage: { low: 90, high: 200 },
            isolation: { low: 40, high: 100 },
            menuiserie: { low: 300, high: 800 },
            platre: { low: 40, high: 80 },
            carrelage: { low: 60, high: 150 },
            peinture: { low: 25, high: 60 },
            cuisine: { low: 5000, high: 15000 },
            'salle-de-bain': { low: 4000, high: 10000 }
        };
        
        // Calcul des coûts
        function calculateCost() {
            const surface = parseInt(document.getElementById('surface').value) || 0;
            const propertyType = document.getElementById('property-type').value;
            const state = document.getElementById('state').value;
            
            if (surface === 0) {
                alert("Veuillez saisir la surface de votre bien.");
                return;
            }
            
            let multiplier = 1;
            if (propertyType === 'maison') multiplier *= 1.1;
            if (state === 'ancien') multiplier *= 1.3;
            if (state === 'neuf') multiplier *= 0.8;
            
            let total = 0;
            let resultsHTML = '';
            
            for (const [key, value] of Object.entries(prices)) {
                const checkbox = document.getElementById(key);
                if (checkbox.checked) {
                    let itemCost;
                    if (key === 'cuisine' || key === 'salle-de-bain') {
                        // For fixed price items
                        itemCost = (value.low + value.high) / 2 * multiplier;
                    } else {
                        // For m² price items
                        itemCost = surface * ((value.low + value.high) / 2) * multiplier;
                    }
                    
                    total += itemCost;
                    
                    const formattedCost = new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                    }).format(itemCost);
                    
                    const name = {
                        'plomberie': 'Plomberie',
                        'electricite': 'Électricité',
                        'chauffage': 'Chauffage',
                        'isolation': 'Isolation',
                        'menuiserie': 'Menuiserie',
                        'platre': 'Cloisons/Plâtrerie',
                        'carrelage': 'Carrelage/Sol',
                        'peinture': 'Peinture',
                        'cuisine': 'Cuisine équipée',
                        'salle-de-bain': 'Salle de bain'
                    }[key];
                    
                    resultsHTML += `
                        <div class="result-item">
                            <span>${name}</span>
                            <span>${formattedCost}</span>
                        </div>
                    `;
                }
            }
            
            const formattedTotal = new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0 
            }).format(total);
            
            resultsHTML += `
                <div class="result-item total">
                    <span>Total estimé</span>
                    <span>${formattedTotal}</span>
                </div>
                <p class="note">Estimation indicative. Un expert vous contactera pour une évaluation précise.</p>
            `;
            
            document.getElementById('results-container').innerHTML = resultsHTML;
        }
        
        // Modal functions
        function showContactModal() {
            document.getElementById('contact-modal').style.display = 'flex';
        }
        
        function closeModal() {
            document.getElementById('contact-modal').style.display = 'none';
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('contact-modal');
            if (event.target === modal) {
                closeModal();
            }
        };
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
    </script>
</body>
</html>
