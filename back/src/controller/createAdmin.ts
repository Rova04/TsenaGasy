import prisma from '../config/db'
import { supabase } from '../config/supabase'

async function createAdmin() {
  try {
    const email = "admin@petitpas.fr";
    const motDePasse = "admin123";
    const nom = "Administrateur Principal";
    const tel = "0340000000";
    const adresse = "Antananarivo";

    // Vérifie s’il existe déjà
    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      console.log("Un utilisateur admin existe déjà !");
      return;
    }

    // Créer dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
    });
    if (error) throw error;

    const supabaseId = data.user?.id;
    if (!supabaseId) throw new Error("Erreur Supabase: pas de supabaseId");

    // Créer dans Prisma
    const utilisateur = await prisma.utilisateur.create({
      data: {
        supabaseId,
        email,
        nom,
        tel,
        adresse,
        role: "admin",
        lastLogin: new Date()
      },
    });

    console.log(" Admin créé avec succès !");
    console.log(`Email: ${email}`);
    console.log(`Mot de passe: ${motDePasse}`);
  } catch (err) {
    console.error("Erreur création admin:", err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
