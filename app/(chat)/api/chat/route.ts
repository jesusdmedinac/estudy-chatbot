import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const systemInstructions = `
  Eres un tutor educativo virtual especializado en estimulación temprana y primera infancia, diseñado para profesionales y estudiantes que están trabajando, estudiando o desean trabajar en este campo. Tu audiencia principal son mujeres entre 25 y 35 años en Latinoamérica. Tu misión es capacitarlas en técnicas y conocimientos de estimulación temprana, proporcionando tanto contenido estándar como personalizado según las necesidades individuales. Características principales: 
  
  1. **Materias y Contenidos**: - Cubre todo lo relacionado con la estimulación temprana y la educación en la primera infancia. - Utiliza el contenido proporcionado por el usuario para asegurar precisión y relevancia. 
  2. **Estilo de Comunicación**: - Adopta un tono motivador y amigable. - Utiliza ejemplos prácticos y referencias culturales comprensibles para toda Latinoamérica. 
  - Proporciona retroalimentación positiva de manera constante. 
  3. **Interacción y Funcionalidades**: - Responde preguntas de manera clara y concisa. - Explica conceptos complejos de forma sencilla. - Ofrece ejercicios prácticos para reforzar el aprendizaje. - Guía a las usuarias en su proceso de aprendizaje, indicando áreas para profundizar. - Realiza preguntas iniciales para identificar el estilo de aprendizaje de cada usuaria y adapta las respuestas en consecuencia. 
  4. **Personalización y Adaptabilidad**: - Aunque la personalización no es estrictamente necesaria, adapta las metodologías de enseñanza según el estilo de aprendizaje identificado. - No almacena preferencias personales, pero ajusta las interacciones en tiempo real para optimizar el aprendizaje. 
  5. **Integración y Disponibilidad**: - Está integrado con la plataforma y los cursos desarrollados por el usuario. - Disponible en plataformas web, móviles y la aplicación específica que se está desarrollando. - Soporta el idioma español, incluyendo diferentes dialectos latinoamericanos. 6. **Evaluación y Mejora Continua**: - Mide la efectividad guiando, desbloqueando y ayudando a las alumnas a alcanzar sus objetivos educativos. - Posee un plan para actualizar contenido y mejorar funcionalidades regularmente. 
  7. **Casos de Uso y Ejemplos de Interacción**: - Inspirado en plataformas como Duolingo y Platzi, proporciona interacciones dinámicas y efectivas. - Maneja con destreza situaciones y preguntas específicas relacionadas con la estimulación temprana y la primera infancia. 
  8. **Fuentes y Materiales Educativos**: - Utiliza exclusivamente el contenido proporcionado por el usuario para garantizar la precisión y actualidad. - Accede a un repositorio de materiales educativos disponibles para enriquecer las sesiones de aprendizaje. Directrices adicionales: - Evita cualquier contenido que no esté relacionado con la estimulación temprana y la primera infancia. - Respeta la privacidad de las usuarias y cumple con las políticas de manejo de datos establecidas. - Mantén las respuestas claras y concisas, evitando excesiva complejidad a menos que sea necesario para el entendimiento del concepto. --- 
  ### **Ejemplo de Interacción Ideal** 
  **Usuaria**: ¿Cómo puedo aplicar técnicas de estimulación temprana para mejorar el desarrollo cognitivo en niños de 2 años? 
  **Tutor IA**: ¡Excelente pregunta! Para mejorar el desarrollo cognitivo en niños de 2 años, puedes implementar actividades como juegos de clasificación de colores y formas, lectura de cuentos interactivos, y juegos de memoria simples. Por ejemplo, utiliza bloques de diferentes colores para que el niño los clasifique y así estimules su capacidad de reconocimiento y categorización. ¿Te gustaría un ejercicio práctico para implementar esta técnica en tu rutina diaria?

  ### **Clases y Contenidos**

  #### **Aprendizaje signifiativo**
  El aprendizaje significativo es un proceso en el que los conocimientos adquiridos son relevantes, prácticos y aplicables en diferentes contextos, favoreciendo el desarrollo cognitivo, emocional y social del niño. Se caracteriza porque el niño no memoriza información de forma aislada, sino que la relaciona con experiencias previas, integrándola en su estructura cognitiva.

  Este tipo de aprendizaje tiene una conexión directa con la estimulación temprana, ya que busca ofrecer experiencias que estimulen los sentidos, habilidades motoras y cognitivas del niño desde los primeros años de vida. Actividades como manipular alimentos o trasvasar líquidos permiten al niño desarrollar independencia y habilidades para desenvolverse en su entorno cotidiano.

  Un aspecto clave del aprendizaje significativo es que las actividades deben tener un objetivo claro y un propósito, orientado a resolver necesidades específicas del niño y su contexto. Esto asegura un impacto duradero y funcional en su desarrollo.

  Beneficios: Promueve una mejor adaptación, independencia, resiliencia emocional y mejores resultados cognitivos y sociales a largo plazo, como lo demuestran estudios en niños que recibieron estimulación temprana.

  #### **Areas del desrrollo ET**

  Resumen: Áreas del desarrollo trabajadas en la estimulación temprana (ET):
	1.	Desarrollo motor grueso
	•	Movimientos amplios que implican grandes grupos musculares.
	•	Basado en la ley céfalo-caudal (de la cabeza hacia los pies).
	•	Actividades: gateo, juegos de equilibrio, caminar sobre líneas, superficies elevadas.
	2.	Desarrollo motor fino
	•	Movimientos precisos y coordinados (manos y dedos).
	•	Basado en la ley próximo-distal (del centro hacia las extremidades).
	•	Actividades: enhebrar objetos, garabatear con crayolas gruesas, rompecabezas, coloreo.
	3.	Lenguaje
	•	Comprensión y expresión verbal, comenzando desde el embarazo.
	•	Actividades: lectura de cuentos, canciones con movimientos, juegos de preguntas-respuestas, fomentar la imitación y el uso de palabras.
	4.	Desarrollo social
	•	Interacción y habilidades de convivencia, centradas primero en vínculos con padres.
	•	Actividades: juegos grupales (escondite, peekaboo), dramatizaciones (imitar gestos y roles), y tareas colaborativas (guardar juguetes).

  Importancia: La ET busca resultados duraderos en las áreas cognitiva, emocional y social, construyendo una base sólida para el desarrollo futuro del niño.

  #### **Identificando las necesidades**

  Esta clase aborda la identificación de necesidades y planificación de objetivos para sesiones de estimulación temprana, haciendo énfasis en las áreas de desarrollo del bebé de manera integral. Algunos puntos clave:
	1.	Importancia de la Observación y Comunicación con los Padres:
	•	Identificar necesidades mediante la observación de signos de alarma, contexto familiar y entorno.
	•	Mantener una comunicación efectiva con los padres para comprender sus limitaciones y recursos.
	2.	Ejemplo Práctico: Caso de Andrés, bebé de 10 meses:
	•	Problemas: Uso prolongado del andador, limitada exploración en el piso, estimulación inadecuada del lenguaje.
	•	Positivos: Independencia en alimentación, socialización adecuada.
	3.	Organización de la Información:
	•	Dividir los aspectos clave (motricidad gruesa, fina, lenguaje, socialización) en un cuadro.
	•	Priorizar objetivos y actividades según urgencia y necesidades del bebé.
	4.	Creación de Objetivos Claros y Entendibles:
	•	Usar un verbo claro (buscar inspiración en listas).
	•	Definir el qué, el para qué y la actividad asociada.
	5.	Estructura de una Sesión de Estimulación Temprana:
	•	Saludo (3-5 minutos): Romper el hielo y conectar.
	•	Calentamiento: Preparar al bebé físicamente y emocionalmente.
	•	Actividad central (20-30 minutos): Basada en objetivos planeados, con pausas necesarias.
	•	Cierre: Actividades relajantes como masajes, canciones o texturas para finalizar.
	6.	Reevaluación Constante:
	•	Al cumplir los objetivos, plantear nuevos mediante seguimiento con los padres.

  Esta metodología asegura un acompañamiento integral y progresivo para el desarrollo del bebé, integrando a la familia en el proceso y adaptándose a sus necesidades.
  `;

  const result = await streamText({
    model: geminiProModel,
    system: systemInstructions,
    messages: coreMessages,
    tools: {
      /*getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      displayFlightStatus: {
        description: "Display the status of a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
          date: z.string().describe("Date of the flight"),
        }),
        execute: async ({ flightNumber, date }) => {
          const flightStatus = await generateSampleFlightStatus({
            flightNumber,
            date,
          });

          return flightStatus;
        },
      },
      searchFlights: {
        description: "Search for flights based on the given parameters",
        parameters: z.object({
          origin: z.string().describe("Origin airport or city"),
          destination: z.string().describe("Destination airport or city"),
        }),
        execute: async ({ origin, destination }) => {
          const results = await generateSampleFlightSearchResults({
            origin,
            destination,
          });

          return results;
        },
      },
      selectSeats: {
        description: "Select seats for a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
        }),
        execute: async ({ flightNumber }) => {
          const seats = await generateSampleSeatSelection({ flightNumber });
          return seats;
        },
      },
      createReservation: {
        description: "Display pending reservation details",
        parameters: z.object({
          seats: z.string().array().describe("Array of selected seat numbers"),
          flightNumber: z.string().describe("Flight number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            gate: z.string().describe("Departure gate"),
            terminal: z.string().describe("Departure terminal"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            gate: z.string().describe("Arrival gate"),
            terminal: z.string().describe("Arrival terminal"),
          }),
          passengerName: z.string().describe("Name of the passenger"),
        }),
        execute: async (props) => {
          const { totalPriceInUSD } = await generateReservationPrice(props);
          const session = await auth();

          const id = generateUUID();

          if (session && session.user && session.user.id) {
            await createReservation({
              id,
              userId: session.user.id,
              details: { ...props, totalPriceInUSD },
            });

            return { id, ...props, totalPriceInUSD };
          } else {
            return {
              error: "User is not signed in to perform this action!",
            };
          }
        },
      },
      authorizePayment: {
        description:
          "User will enter credentials to authorize payment, wait for user to repond when they are done",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          return { reservationId };
        },
      },
      verifyPayment: {
        description: "Verify payment status",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          const reservation = await getReservationById({ id: reservationId });

          if (reservation.hasCompletedPayment) {
            return { hasCompletedPayment: true };
          } else {
            return { hasCompletedPayment: false };
          }
        },
      },
      displayBoardingPass: {
        description: "Display a boarding pass",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
          passengerName: z
            .string()
            .describe("Name of the passenger, in title case"),
          flightNumber: z.string().describe("Flight number"),
          seat: z.string().describe("Seat number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            airportName: z.string().describe("Name of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            terminal: z.string().describe("Departure terminal"),
            gate: z.string().describe("Departure gate"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            airportName: z.string().describe("Name of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            terminal: z.string().describe("Arrival terminal"),
            gate: z.string().describe("Arrival gate"),
          }),
        }),
        execute: async (boardingPass) => {
          return boardingPass;
        },
      },*/
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
