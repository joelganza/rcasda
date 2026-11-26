import { PageHeader } from "@/components/page-header";
import { LibraryView } from "@/components/library/library-view";
import { getSessionUser } from "@/lib/auth";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your library",
  description:
    "Bookmarks, favourites, private notes, reading history and lesson progress — saved on this device, and to your account when signed in.",
};

export default async function LibraryPage() {
  const user = await getSessionUser();

  return (
    <div>
      <PageHeader
        eyebrow="Personal"
        title="Your library"
        description="Everything you have saved, noted and read. Works without an account; sign in to sync across devices."
        photo={PHOTOS.library}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <LibraryView user={user} />
      </div>
    </div>
  );
}
