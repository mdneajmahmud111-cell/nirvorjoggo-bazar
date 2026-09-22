import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { StarRating } from "@/components/star-rating";

export default async function AccountReviewsPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login?callbackUrl=/account/reviews");

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } },
  });

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Reviews</h1>

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">
          You haven&rsquo;t written any reviews yet. You can review a product after it has been delivered.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="card p-4">
              <div className="flex items-center justify-between">
                <Link href={`/product/${review.product.slug}`} className="font-medium text-gray-900 hover:text-brand-700">
                  {review.product.name}
                </Link>
                <span className={`badge ${review.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {review.isApproved ? "Published" : "Pending approval"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={review.rating} />
                <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>}
              <p className="mt-1 text-sm text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
