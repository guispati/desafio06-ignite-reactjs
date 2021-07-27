import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import styles from './post.module.scss';
import Head from 'next/head';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { Fragment } from 'react';
import Comments from '../../components/Comments/'
import Link from 'next/link';

interface Post {
    first_publication_date: string | null;
    last_publication_date: string | null;
    data: {
        title: string;
        banner: {
        url: string;
        };
        author: string;
        content: {
        heading: string;
        body: {
            text: string;
        }[];
        }[];
    };
    next?: {
        uid: string;
        title: string;
    } | null;
    prev?: {
        uid: string;
        title: string;
    } | null;
}

interface PostProps {
    post: Post;
    preview: boolean,
}

export default function Post({post, preview}: PostProps): JSX.Element {
    const router = useRouter()
    let edit:boolean = false;

    if (post.last_publication_date != null && post.last_publication_date != post.first_publication_date)  {
        edit = true;
    }

    if (router.isFallback) {
        return <div>Carregando...</div>
    }

    const mediaPalavras = 200;

    const totalPalavras = post.data.content.reduce((c, content) => {
        c += content.heading.split(/\S+/g).length;
        c += RichText.asText(content.body).split(/\S+/g).length;

        return c;
    }, 0)

    const tempoLeitura = Math.ceil(totalPalavras/mediaPalavras);
    
    return (
        <>
            <Head>
                <title>{post.data.title} | spacetravelling</title>
            </Head>

            <img className={styles.banner} src={ post.data.banner.url} />
            <main className={styles.container}>
                <article className={styles.post}>
                    <h1 className={styles.postTitle}>{post.data.title}</h1>
                    <div className={styles.info}>
                        <span>
                            <FiCalendar />
                            {format(
                                new Date(post.first_publication_date),
                                "dd MMM yyyy",
                                {
                                    locale: ptBR,
                                }
                            )}
                        </span>
                        <span> <FiUser /> {post.data.author} </span>
                        <span> <FiClock /> {tempoLeitura} min </span>
                        <span> {edit && (
                            <div className={styles.editTime}>
                                * editado em {format(
                                    new Date(post.last_publication_date),
                                    "dd MMM yyyy, 'às' HH:mm",
                                    {
                                        locale: ptBR,
                                    }
                                )}
                            </div>
                        )} </span>
                    </div>
                    <div className={styles.content}>
                        {post.data.content.map((content, key) => (
                            <Fragment key={key}>
                                <div className={styles.heading}>
                                    {content.heading}
                                </div>
                                <div
                                    className={styles.body}
                                    dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}
                                >
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </article>
                <div className={styles.postsNav}>
                    {post.prev.uid && (
                        <div>
                            <span>{post.prev.title}</span>
                            <Link href={`/post/${post.prev.uid}`}>
                                <a>Post anterior</a>
                            </Link>
                        </div>
                    )}
                    {post.next.uid && (
                        <div>
                            <span>{post.next.title}</span>
                            <Link href={`/post/${post.next.uid}`}>
                                <a>Próximo post</a>
                            </Link>
                        </div>
                    )}
                </div>
                <Comments />
                <div id="inject-comments-for-uterances"></div>
                {preview && (
                    <aside>
                        <Link href="/api/exit-preview">
                        <a>Sair do modo Preview</a>
                        </Link>
                    </aside>
                )}
            </main>
        </>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const prismic = getPrismicClient();

    const posts = await prismic.query([
        Prismic.predicates.at('document.type', 'post')
    ], {
        fetch: [
            'post.title',
            'post.banner',
            'post.author',
            'post.content'
        ]
    });

    const paths = posts.results.map(path => ({
        params: {
            slug: path.uid,
        }
    }))

    return {
        paths,
        fallback: true
    }
};

export const getStaticProps: GetStaticProps<PostProps> = async ({ 
    params, 
    preview = false,
    previewData,
}) => {
    const { slug } = params;
    const prismic = getPrismicClient();
    const response = await prismic.getByUID('post', String(slug), {
        ref: previewData?.ref ?? null,
    });

    const nextPosts = await prismic.query(
        Prismic.predicates.at('document.type', 'post'),
        {
            pageSize: 1,
            after: response?.id,
            orderings: '[document.first_publication_date desc]',
            ref: previewData?.ref ?? null,
        }
    );

    const prevPosts = await prismic.query(
        Prismic.predicates.at('document.type', 'post'),
        {
            pageSize: 1,
            after: response?.id,
            orderings: '[document.first_publication_date]',
            ref: previewData?.ref ?? null,
        }
    )

    const post = {
        first_publication_date: response.first_publication_date,
        last_publication_date: response.last_publication_date,
        data: {
            title: response.data.title,
            banner: {
                url: response.data.banner.url,
            },
            author: response.data.author,
            content: response.data.content,
            subtitle: response.data.subtitle,
        },
        uid: response.uid,
        id: response.id,
        next: {
            uid: nextPosts.results[0] !== undefined ? nextPosts.results[0].uid : null,
            title: nextPosts.results[0] !== undefined ? nextPosts.results[0].data.title : null
        },
        prev: {
            uid: prevPosts.results[0] !== undefined ? prevPosts.results[0].uid : null,
            title: prevPosts.results[0] !== undefined ? prevPosts.results[0].data.title : null,
        },
    };

    return {
        props: {
            post,
            preview,
        },
        revalidate: 60 * 60 //1 hora
    }
};
