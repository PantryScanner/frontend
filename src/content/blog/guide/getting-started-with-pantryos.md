---
title: "Getting Started with PantryOS: la guida completa in 10 minuti"
description: "Come configurare PantryOS in pochi minuti: gruppi, dispense, scanner mobile e prime scorte. La guida ufficiale per iniziare."
date: 2026-05-12
category: guide
tags: [getting-started, tutorial, pantryos, dispensa]
author: "Matteo Q."
featured: true
---

PantryOS trasforma la tua dispensa in un sistema **realtime**, condiviso e organizzato. In meno di 10 minuti puoi avere tutto pronto: gruppo casa, dispense, scorte iniziali e scanner mobile attivo.

Questa guida ti accompagna passo per passo dalla creazione dell'account al primo prodotto tracciato.

## 1. Crea il tuo account

Vai su `/auth` e registrati con email o accedi con Google. Verifica l'email per attivare il profilo.

> **Suggerimento:** se hai più persone in famiglia, fai registrare almeno un altro membro. PantryOS è pensato per essere condiviso.

## 2. Configura il tuo primo Gruppo

Al primo accesso ti verrà chiesto di creare un **Gruppo** (la tua "casa"). Tutto in PantryOS è centrato sul gruppo: dispense, prodotti, scanner fisici e cronologia consumi appartengono al gruppo, non al singolo utente.

Cosa configurare:

- **Nome del gruppo** (es. "Casa Rossi")
- **Inviti**: aggiungi familiari o coinquilini via email
- **Ruoli**: chi può solo leggere, chi può modificare le scorte

## 3. Crea le tue Dispense

Una dispensa è uno spazio fisico: la credenza in cucina, il frigorifero, il freezer, il magazzino. Crea quante dispense vuoi.

| Dispensa | Esempi |
|----------|--------|
| Credenza | Pasta, riso, scatolame |
| Frigorifero | Latticini, freschi |
| Freezer | Surgelati, carne |
| Cantina | Vini, conserve |

## 4. Aggiungi i primi prodotti

Hai tre modi per popolare l'inventario:

1. **Scanner mobile**: clicca l'icona scanner nell'header, scegli la dispensa e tieni premuto il pulsante grande mentre inquadri il codice a barre. PantryOS recupera nome, marca e immagine da OpenFoodFacts.
2. **Scanner fisico**: se hai uno scanner PantryOS (`SCN-XXXXXXXX-XXXX`), basta scansionare — il prodotto entra nella dispensa associata.
3. **Aggiunta manuale**: da Inventario → "Nuovo prodotto".

```bash
# Esempio: i codici scanner sono identificatori univoci
SCN-A1B2C3D4-1234
```

## 5. Imposta soglie e scadenze

Per ogni prodotto puoi configurare:

- **Soglia minima** (es. "avvisami quando restano meno di 2 pacchi di pasta")
- **Data di scadenza** (PantryOS ti notifica 7 giorni prima)
- **Consumo medio** (calcolato in automatico dopo qualche settimana)

## 6. Esplora il Dashboard

Dal dashboard vedi a colpo d'occhio:

- Scorte in esaurimento
- Prossime scadenze
- Trend di consumo
- Stato di ogni dispensa

## Pronto a partire

Hai tutto quello che serve. La cosa più importante: **mantieni l'abitudine di scansionare quando entra o esce qualcosa dalla dispensa**. Dopo 2 settimane PantryOS inizia a prevedere quando finiranno le scorte e a suggerirti la lista della spesa.

Buon inventario.
