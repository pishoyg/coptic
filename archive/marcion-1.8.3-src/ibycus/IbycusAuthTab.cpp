#include "IbycusAuthTab.h"

__IBYCUS_BEGIN_NAMESPACE

/*
 * Constructor
 */

IbycusAuthTab::IbycusAuthTab(const ibystring_t & dn, const ibystring_t & fn)
        throw(IbycusFileException, IbycusParseException)
{
        ibystring_t fullname = dn + "/" + fn;
        ibyFile list_file(fullname.c_str());

        ibychar_t listname[5];
        ibylen_t listpos, listlen;

        if (list_file.is_open()) {
                while (! list_file.eof()) {
                        list_file.read(listname, sizeof(listname)-1);
                        listname[4] = '\0';
                        if (strcmp((const char *)listname, "*END") == 0)
                                break;

                        list_file >> listpos;
                        list_file >> listlen;
                        listlen -= 8;
                        corpora_.push_back(ibyAuthTabCorpus(list_file, listlen, listname));

                }
        } else {
                throw IbycusFileException("Couldn't open file: " + fullname);
        }
        list_file.close();
}

/*
 * Return the index in corpora_ of a corpus with a specific tag
 */
int IbycusAuthTab::Index(const ibystring_t & tag) const throw(IbycusException)
{
        unsigned int i;
        int rv = -1;
        for (i=0; i < corpora_.size(); ++i) {
                if (corpora_[i].Tag() == tag)
                        rv = i;
                        i = corpora_.size(); // to end the loop
        }

        if (rv >= 0)
        {
                return rv;
        } else {
                throw IbycusException("No corpus with the tag " + tag);
        }
        return -1;
}

/*
 * Return the tag of the corpus identified by index
 */
const ibystring_t & IbycusAuthTab::Tag(int index) const
{
        try {
                return corpora_[index].Tag();
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return the number of authors in the corpus identified by index
 */
int IbycusAuthTab::Count(int index) const throw(IbycusException)
{
        try {
                return corpora_[index].Count();
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return the number of authors in the corpus identified by tag
 */
int IbycusAuthTab::Count(const ibystring_t & tag) const throw(IbycusException)
{
        try {
                return corpora_[Index(tag)].Count();
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the tag " + tag);
        }
}

/*
 * Return the name of the corpus identified by index
 */
const ibystring_t & IbycusAuthTab::Name(int index) const
{
        try {
                return corpora_[index].Name();
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return the name of an author in a corpus
 */
const ibystring_t & IbycusAuthTab::Name(int corpus, int author) const
        throw(IbycusException)
{
        try {
                return corpora_[corpus].Name(author);
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return the id of an author in a corpus
 */
const ibystring_t & IbycusAuthTab::Id(int corpus, int author) const
        throw(IbycusException)
{
        try {
                return corpora_[corpus].Id(author);
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return the number of aliases of an author in a corpus
 */
int IbycusAuthTab::AliasCount(int corpus, int author) const
        throw(IbycusException)
{
        try {
                return corpora_[corpus].AliasCount(author);
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

/*
 * Return an alias of an author in a corpus
 */
const ibystring_t & IbycusAuthTab::Alias(int corpus, int author, int alias) const
        throw(IbycusException)
{
        try {
                return corpora_[corpus].Alias(author, alias);
        } catch(out_of_range E) {
                throw IbycusException("No corpus with the index");
        }
}

__IBYCUS_END_NAMESPACE
