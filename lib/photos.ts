/**
 * Editorial photography used across the platform.
 *
 * Each entry carries its own alt text and photographer credit so that a photo
 * can never be dropped into a page without a truthful description and source.
 * All photographs are used under the Unsplash License.
 */
export type Photo = {
  src: string;
  alt: string;
  credit: {
    name: string;
    href: string;
  };
  position?: string;
};

export const PHOTOS = {
  hero: {
    src: "/images/hero-open-bible.jpg",
    alt: "An open Bible resting on a wooden table in low light",
    credit: {
      name: "Ioann-Mark Kuznietsov",
      href: "https://unsplash.com/photos/open-book-on-top-of-desk-USS2u1-98io",
    },
    position: "58% 52%",
  },
  bible: {
    src: "/images/bible-pages.jpg",
    alt: "An open Bible on a stone ledge, with autumn trees behind it",
    credit: {
      name: "Aaron Burden",
      href: "https://unsplash.com/photos/bible-page-on-gray-concrete-surface-9zsHNt5OpqE",
    },
    position: "50% 54%",
  },
  bibleCloseup: {
    src: "/images/bible-closeup.jpg",
    alt: "A close view of printed Bible pages in warm light",
    credit: {
      name: "Christopher Stites",
      href: "https://unsplash.com/photos/an-open-bible-with-sunlight-streaming-through-blinds-MszZIWTVOi8",
    },
    position: "50% 45%",
  },
  hymnal: {
    src: "/images/hymnal-music-book.jpg",
    alt: "An open hymnal showing hymn texts and musical notation",
    credit: {
      name: "Mick Haupt",
      href: "https://unsplash.com/photos/opened-music-book-7UWMKBlY_4w",
    },
    position: "50% 50%",
  },
  sabbathSchool: {
    src: "/images/study-together.jpg",
    alt: "Three people reading books and writing notes around a wooden table",
    credit: {
      name: "Alexis Brown",
      href: "https://unsplash.com/photos/people-reading-and-writing-at-table-omeaHbEFlN4",
    },
    position: "50% 38%",
  },
  plans: {
    src: "/images/reading-plan.jpg",
    alt: "An open Bible resting on a rock above a mountain valley",
    credit: {
      name: "Simon Ray",
      href: "https://unsplash.com/photos/open-bible-rests-on-a-rock-overlooking-mountains-ajMaWOuYJKY",
    },
    position: "50% 62%",
  },
  library: {
    src: "/images/library-books.jpg",
    alt: "A wall of well-worn books with pale covers",
    credit: {
      name: "Patrick Tomasso",
      href: "https://unsplash.com/photos/open-book-lot-Oaqk7qqNh_c",
    },
    position: "50% 50%",
  },
  church: {
    src: "/images/church-interior.jpg",
    alt: "A quiet church aisle lined with wooden pews",
    credit: {
      name: "Debby Hudson",
      href: "https://unsplash.com/photos/cathedral-interior-sgdyBq6kheQ",
    },
    position: "50% 55%",
  },
} satisfies Record<string, Photo>;
