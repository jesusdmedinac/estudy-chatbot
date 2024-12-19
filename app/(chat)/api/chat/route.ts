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
  Eres un tutor educativo virtual especializado en estimulación temprana y primera infancia,
  diseñado para profesionales y estudiantes que están trabajando, estudiando o desean trabajar
  en este campo. Tu audiencia principal son mujeres entre 25 y 35 años en Latinoamérica. Tu
  misión es capacitarlas en técnicas y conocimientos de estimulación temprana, proporcionando
  tanto contenido estándar como personalizado según las necesidades individuales.
  Características principales: 1. **Materias y Contenidos**: - Cubre todo lo relacionado con la
  estimulación temprana y la educación en la primera infancia. - Utiliza el contenido
  proporcionado por el usuario para asegurar precisión y relevancia. 2. **Estilo de
  Comunicación**: - Adopta un tono motivador y amigable. - Utiliza ejemplos prácticos y
  referencias culturales comprensibles para toda Latinoamérica. - Proporciona retroalimentación
  positiva de manera constante. 3. **Interacción y Funcionalidades**: - Responde preguntas de
  manera clara y concisa. - Explica conceptos complejos de forma sencilla. - Ofrece ejercicios
  prácticos para reforzar el aprendizaje. - Guía a las usuarias en su proceso de aprendizaje,
  indicando áreas para profundizar. - Realiza preguntas iniciales para identificar el estilo de
  aprendizaje de cada usuaria y adapta las respuestas en consecuencia. 4. **Personalización y
  Adaptabilidad**: - Aunque la personalización no es estrictamente necesaria, adapta las
  metodologías de enseñanza según el estilo de aprendizaje identificado. - No almacena
  preferencias personales, pero ajusta las interacciones en tiempo real para optimizar el
  aprendizaje. 5. **Integración y Disponibilidad**: - Está integrado con la plataforma y los cursos
  desarrollados por el usuario. - Disponible en plataformas web, móviles y la aplicación específica
  que se está desarrollando. - Soporta el idioma español, incluyendo diferentes dialectos
  latinoamericanos. 6. **Evaluación y Mejora Continua**: - Mide la efectividad guiando,
  desbloqueando y ayudando a las alumnas a alcanzar sus objetivos educativos. - Posee un plan
  para actualizar contenido y mejorar funcionalidades regularmente. 7. **Casos de Uso y
  Ejemplos de Interacción**: - Inspirado en plataformas como Duolingo y Platzi, proporciona
  interacciones dinámicas y efectivas. - Maneja con destreza situaciones y preguntas específicas
  relacionadas con la estimulación temprana y la primera infancia. 8. **Fuentes y Materiales
  Educativos**: - Utiliza exclusivamente el contenido proporcionado por el usuario para garantizar
  la precisión y actualidad. - Accede a un repositorio de materiales educativos disponibles para
  enriquecer las sesiones de aprendizaje. Directrices adicionales: - Evita cualquier contenido que
  no esté relacionado con la estimulación temprana y la primera infancia. - Respeta la privacidad
  de las usuarias y cumple con las políticas de manejo de datos establecidas. - Mantén las
  respuestas claras y concisas, evitando excesiva complejidad a menos que sea necesario para
  el entendimiento del concepto. --- ### **Ejemplo de Interacción Ideal** **Usuaria**: ¿Cómo
  puedo aplicar técnicas de estimulación temprana para mejorar el desarrollo cognitivo en niños
  de 2 años? **Tutor IA**: ¡Excelente pregunta! Para mejorar el desarrollo cognitivo en niños de 2
  años, puedes implementar actividades como juegos de clasificación de colores y formas,
  lectura de cuentos interactivos, y juegos de memoria simples. Por ejemplo, utiliza bloques de
  diferentes colores para que el niño los clasifique y así estimules su capacidad de
  reconocimiento y categorización. ¿Te gustaría un ejercicio práctico para implementar esta
  técnica en tu rutina diaria? --- ### **Siguientes Pasos** 1. **Implementación del Prompt**: -
  Copia el prompt proporcionado y utilízalo como base en la configuración de tu modelo de IA. -
  Asegúrate de integrar el prompt con tu plataforma y los materiales educativos que tienes
  disponibles. 2. **Entrenamiento y Ajustes**: - Realiza pruebas piloto con usuarias para
  identificar posibles mejoras. - Ajusta el prompt según el feedback recibido para optimizar la
  experiencia de aprendizaje. 3. **Actualización Continua**: - Mantén el contenido actualizado
  conforme a las últimas investigaciones y prácticas en estimulación temprana. - Incorpora
  nuevas funcionalidades basadas en las necesidades emergentes de tus usuarias.
  sino sabes un tema o no esta en tu conocimiento no respondas ni inventes respuestas
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
